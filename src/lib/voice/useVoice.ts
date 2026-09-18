"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PiperStatus, PiperVoice } from "./piper";
import { OfflineSTT } from "./offline-stt";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "awaiting_confirmation" | "success" | "error";

type ConversationState = {
  pendingIntent: string;
  pendingEntities: Record<string, any>;
  missingSlot?: string;
};

export interface VoiceMessage {
  id: string;
  sender: "user" | "shopmate";
  text: string;
  teluguText?: string;
  timestamp: Date;
  status?: "pending" | "executed" | "failed" | "confirmation_required";
  actionData?: any;
}

export function useVoice() {
  const [state, setState] = useState<VoiceState>("idle");
  const [language, setLanguage] = useState<"te-IN" | "en-IN">("te-IN");
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [lastSpeech, setLastSpeech] = useState<string | null>(null);
  const [piperStatus, setPiperStatus] = useState<PiperStatus>({
    state: "unavailable",
    detail: "Checking voice output…",
  });
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    commandText: string;
    conversationState: ConversationState | null;
  } | null>(null);
  const recognitionRef = useRef<any>(null);
  const nativeListenersRef = useRef<Array<{ remove: () => Promise<void> }>>([]);
  const keepListeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const hasFinalResultRef = useRef(false);

  // Initialize Speech Recognition capability check
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasOffline = OfflineSTT.available();
    const hasWebSpeech = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setIsSupported(hasOffline || hasWebSpeech);
  }, []);

  useEffect(() => {
    PiperVoice.status().then(setPiperStatus);
  }, []);

  // Text-to-Speech synthesizer with Telugu voice pack support
  const speak = useCallback(async (text: string, langOverride?: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !text) return;
    const targetLang = langOverride || language;
    const isTelugu = /[\u0C00-\u0C7F]/.test(text) || targetLang === "te-IN";

    try {
      window.speechSynthesis?.cancel();

      // If text is Telugu or language is set to Telugu, route through PiperVoice
      if (isTelugu) {
        if (await PiperVoice.speak(text)) {
          setLastSpeech(text);
          setState("idle");
          onEnd?.();
          return;
        }
      }

      if (!("speechSynthesis" in window)) {
        throw new Error("No system text-to-speech engine is available.");
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = isTelugu ? 0.90 : 0.95;
      utterance.lang = isTelugu ? "te-IN" : "en-IN";

      const voices = window.speechSynthesis.getVoices();
      if (isTelugu) {
        const teluguVoice = voices.find(
          (v) =>
            v.lang === "te-IN" ||
            v.lang.startsWith("te") ||
            v.name.toLowerCase().includes("telugu") ||
            v.name.toLowerCase().includes("venkatesh")
        );
        if (teluguVoice) utterance.voice = teluguVoice;
      } else {
        const indianVoice = voices.find(
          (v) =>
            v.lang.includes("en-IN") ||
            v.name.includes("India") ||
            v.lang.includes("hi-IN")
        );
        if (indianVoice) utterance.voice = indianVoice;
      }

      setState("speaking");
      utterance.onend = () => {
        setState("idle");
        onEnd?.();
      };
      utterance.onerror = () => setState("idle");
      window.speechSynthesis.speak(utterance);
      setLastSpeech(text);
    } catch (e) {
      console.warn("Speech synthesis failed:", e);
    }
  }, [language]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    void PiperVoice.stop();
  }, []);

  // Start microphone listening
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    stopSpeaking(); // Let the shopkeeper interrupt a spoken response naturally.
    keepListeningRef.current = true;
    finalTranscriptRef.current = "";
    hasFinalResultRef.current = false;

    if (OfflineSTT.available()) {
      const startNativeListening = async () => {
        try {
          await Promise.all(nativeListenersRef.current.map(listener => listener.remove()));
          nativeListenersRef.current = await Promise.all([
            OfflineSTT.on("partial", ({ text }) => setTranscript(text || "")),
            OfflineSTT.on("result", ({ text }) => setTranscript(text || "")),
            OfflineSTT.on("final", ({ text }) => {
              const finalText = text?.trim() || "";
              setTranscript(finalText);
              if (finalText && keepListeningRef.current) {
                keepListeningRef.current = false;
                processCommand(finalText);
              }
              else setState("idle");
            }),
            OfflineSTT.on("error", ({ message }) => {
              console.warn("Offline speech error:", message);
              setState("error");
            }),
            OfflineSTT.on("timeout", () => setState("idle")),
          ]);
          await OfflineSTT.start();
          recognitionRef.current = { stop: () => OfflineSTT.stop() };
          setState("listening");
          setTranscript("");
        } catch (error) {
          console.warn("Unable to start offline speech recognition:", error);
          setState("error");
        }
      };
      void startNativeListening();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setState("error");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort?.();
      }

      const recognition = new SpeechRecognition();
      // One utterance per recognition instance is more stable across Chrome,
      // Edge, and Android WebViews. `onend` below retries only when no final
      // speech was captured, so silence does not make the mic appear broken.
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language; // "te-IN" for Telugu voice recognition or "en-IN"

      recognition.onstart = () => {
        setState("listening");
        setTranscript("");
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += event.results[i][0].transcript;
            hasFinalResultRef.current = true;
          }
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error !== "no-speech" && event.error !== "aborted") {
          setState("error");
        }
      };

      recognition.onend = () => {
        const finalText = finalTranscriptRef.current.trim();
        if (hasFinalResultRef.current && finalText) {
          keepListeningRef.current = false;
          finalTranscriptRef.current = "";
          hasFinalResultRef.current = false;
          processCommand(finalText);
          return;
        }

        // Browser SpeechRecognition ends a no-speech turn itself. Restarting
        // the same instance here causes intermittent InvalidState errors in
        // Chromium/WebKit, which appeared as a flashing red mic. Return to
        // Ready cleanly; the next tap starts a fresh recognition instance.
        keepListeningRef.current = false;
        setState("idle");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setState("error");
    }
  }, [language, stopSpeaking]);

  const stopListening = useCallback(() => {
    keepListeningRef.current = false;
    finalTranscriptRef.current = "";
    hasFinalResultRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop?.();
    }
  }, []);

  // Sends command to AI backend
  const inferConversationState = (result: any): ConversationState | null => {
    if (!result?.clarification_question) return null;
    const entities = result.entities || {};
    let missingSlot = "";
    if (result.intent === "record_purchase") {
      missingSlot = !entities.product_name ? "product_name" : !entities.quantity ? "quantity" : "amount";
    } else if (result.intent === "record_sale" || result.intent === "record_credit_sale") {
      missingSlot = !entities.product_name ? "product_name" : "quantity";
    }
    return { pendingIntent: result.intent, pendingEntities: entities, missingSlot };
  };

  const processCommand = async (
    commandText: string,
    confirmExecution: boolean = false,
    stateOverride: ConversationState | null = conversationState
  ) => {
    // Voice-driven confirmation or cancellation check
    const normalizedInput = commandText.toLowerCase().trim();
    if (pendingConfirmation && !confirmExecution) {
      if (
        /^(yes|yep|yeah|sure|confirm|record it|proceed|okay|ok|avunu|ha|haan|sare|cheyyi|సరే|అవును|నమోదు చేయండి|చేయండి|రికార్డ్ చేయి)$/i.test(normalizedInput) ||
        /^(yes please|ha record cheyyi|avunu record cheyyi|ha sare|avunu cheyyi)$/i.test(normalizedInput)
      ) {
        await confirmPending();
        return;
      }
      if (
        /^(no|cancel|stop|don't|abort|vaddu|odhu|vadhu|వద్దు|రద్దు చేయండి|ఆపండి|వద్దు రద్దు చేయి)$/i.test(normalizedInput) ||
        /^(no cancel|vaddu odhu|cancel cheyyi)$/i.test(normalizedInput)
      ) {
        cancelConversation();
        return;
      }
    }

    setState("processing");

    // Add user message to history
    const userMsg: VoiceMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: commandText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/voice/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: commandText,
          language,
          conversationState: stateOverride,
          confirmExecution,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorSpeech = data.speechResponse || data.error || "Sorry, I couldn't process that.";
        setState("error");
        speak(errorSpeech, language);

        const aiMsg: VoiceMessage = {
          id: `ai-${Date.now()}`,
          sender: "shopmate",
          text: errorSpeech,
          timestamp: new Date(),
          status: "failed",
        };
        setMessages((prev) => [...prev, aiMsg]);
        return data;
      }

      // Select speech to play: prioritize Telugu if selected or available
      const speechToPlay = (language === "te-IN" && data.speechResponseTelugu)
        ? data.speechResponseTelugu
        : (data.speechResponse || "Recorded.");
      const nextConversationState = inferConversationState(data.result);
      const shouldListenForReply = Boolean(
        nextConversationState || (data.result?.requires_confirmation && !confirmExecution)
      );
      if (nextConversationState) {
        setConversationState(nextConversationState);
      } else if (data.result?.requires_confirmation && !confirmExecution) {
        setPendingConfirmation({ commandText, conversationState: stateOverride });
        setState("awaiting_confirmation");
      } else {
        setConversationState(null);
        setPendingConfirmation(null);
        setState("success");
      }

      // Complete the conversational turn hands-free: after a follow-up or
      // confirmation prompt is spoken, listen for the shopkeeper's reply.
      void speak(speechToPlay, language, shouldListenForReply ? () => startListening() : undefined);

      const aiMsg: VoiceMessage = {
        id: `ai-${Date.now()}`,
        sender: "shopmate",
        text: data.speechResponse || speechToPlay,
        teluguText: data.speechResponseTelugu,
        timestamp: new Date(),
        status: data.result?.requires_confirmation ? "confirmation_required" : "executed",
        actionData: data,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Return back to idle state after brief success celebration
      if (!nextConversationState && !(data.result?.requires_confirmation && !confirmExecution)) {
        setTimeout(() => setState("idle"), 2500);
      } else if (nextConversationState) {
        setState("idle");
      }

      return data;
    } catch (err: any) {
      setState("error");
      const errorMsg = language === "te-IN"
        ? "నెట్‌వర్క్ లోపం. దయచేసి మళ్ళీ ప్రయత్నించండి."
        : "Network error. Please try again or type your command.";
      speak(errorMsg, language);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "shopmate",
          text: errorMsg,
          timestamp: new Date(),
          status: "failed",
        },
      ]);
    }
  };

  const confirmPending = async () => {
    if (!pendingConfirmation) return;
    await processCommand(
      pendingConfirmation.commandText,
      true,
      pendingConfirmation.conversationState
    );
  };

  const cancelConversation = useCallback(() => {
    setConversationState(null);
    setPendingConfirmation(null);
    setState("idle");
    const cancelText = language === "te-IN"
      ? "రద్దు చేయబడింది. మీ షాప్ రికార్డులలో ఎటువంటి మార్పులు చేయలేదు."
      : "Cancelled. Nothing was changed in your shop records.";
    const message: VoiceMessage = {
      id: `ai-${Date.now()}`,
      sender: "shopmate",
      text: cancelText,
      teluguText: "రద్దు చేయబడింది. మీ షాప్ రికార్డులలో ఎటువంటి మార్పులు చేయలేదు.",
      timestamp: new Date(),
    };
    speak(cancelText, language);
    setMessages((previous) => [...previous, message]);
  }, [language, speak]);

  const clearConversation = useCallback(() => {
    setConversationState(null);
    setPendingConfirmation(null);
    setMessages([]);
    setState("idle");
  }, []);

  return {
    state,
    transcript,
    messages,
    language,
    setLanguage,
    isSupported,
    lastSpeech,
    piperStatus,
    pendingConfirmation,
    startListening,
    stopListening,
    processCommand,
    speak,
    stopSpeaking,
    confirmPending,
    cancelConversation,
    clearConversation,
    setMessages,
  };
}
