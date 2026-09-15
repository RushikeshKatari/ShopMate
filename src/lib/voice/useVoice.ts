"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type VoiceState = "idle" | "listening" | "processing" | "success" | "error";

export interface VoiceMessage {
  id: string;
  sender: "user" | "shopmate";
  text: string;
  timestamp: Date;
  status?: "pending" | "executed" | "failed" | "confirmation_required";
  actionData?: any;
}

export function useVoice() {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [lastSpeech, setLastSpeech] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  // Text-to-Speech synthesizer
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop previous utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Natural, clear pace for retail environment

      // Attempt to find an Indian English or Hindi voice
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(
        (v) =>
          v.lang.includes("en-IN") ||
          v.name.includes("India") ||
          v.lang.includes("hi-IN")
      );

      if (indianVoice) {
        utterance.voice = indianVoice;
      }

      window.speechSynthesis.speak(utterance);
      setLastSpeech(text);
    } catch (e) {
      console.warn("Speech synthesis failed:", e);
    }
  }, []);

  // Start microphone listening
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState("error");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // Default to Indian English

      recognition.onstart = () => {
        setState("listening");
        setTranscript("");
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setState("error");
        } else {
          setState("idle");
        }
      };

      recognition.onend = () => {
        // When user stops speaking, process transcript if available
        setTranscript((finalTranscript) => {
          if (finalTranscript.trim()) {
            processCommand(finalTranscript.trim());
          } else {
            setState("idle");
          }
          return finalTranscript;
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setState("error");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Sends command to AI backend
  const processCommand = async (commandText: string, confirmExecution: boolean = false) => {
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
          confirmExecution,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorSpeech = data.speechResponse || data.error || "Sorry, I couldn't process that.";
        setState("error");
        speak(errorSpeech);

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

      setState("success");
      const speech = data.speechResponse || "Recorded.";
      speak(speech);

      const aiMsg: VoiceMessage = {
        id: `ai-${Date.now()}`,
        sender: "shopmate",
        text: speech,
        timestamp: new Date(),
        status: data.result?.requires_confirmation ? "confirmation_required" : "executed",
        actionData: data,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Return back to idle state after brief success celebration
      setTimeout(() => {
        setState("idle");
      }, 2500);

      return data;
    } catch (err: any) {
      setState("error");
      const errorMsg = "Network error. Please try again or type your command.";
      speak(errorMsg);

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

  return {
    state,
    transcript,
    messages,
    isSupported,
    lastSpeech,
    startListening,
    stopListening,
    processCommand,
    speak,
    setMessages,
  };
}
