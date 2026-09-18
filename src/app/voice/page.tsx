"use client";

import { useState } from "react";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { useVoice } from "@/lib/voice/useVoice";
import { cn, formatDateTime } from "@/lib/utils";

const DEMO_COMMANDS_EN = [
  { label: "Step 1: Purchase", cmd: "I bought 10 kilos of rice for ₹520" },
  { label: "Step 2: Pricing", cmd: "I want ₹10 profit per kilo on rice" },
  { label: "Step 3: Query", cmd: "What is the selling price of rice?" },
  { label: "Step 4: Khata Credit", cmd: "Ramesh took 2 kilos of rice on khata" },
  { label: "Step 5: Payment", cmd: "Ramesh paid ₹124" },
  { label: "Step 6: Business Brief", cmd: "How is business today?" },
];

const DEMO_COMMANDS_TE = [
  { label: "దశ 1: కొనుగోలు", cmd: "10 కేజీల బియ్యం ₹520 కి కొన్నాను" },
  { label: "దశ 2: ధర నిర్ణయం", cmd: "బియ్యం పై కేజీకి ₹10 లాభం పెట్టు" },
  { label: "దశ 3: ధర వివరాలు", cmd: "బియ్యం ధర ఎంత?" },
  { label: "దశ 4: ఖాతా అప్పు", cmd: "రమేష్ 2 కేజీల బియ్యం ఖాతాలో తీసుకున్నాడు" },
  { label: "దశ 5: చెల్లింపు", cmd: "రమేష్ ₹124 చెల్లింపు చేశాడు" },
  { label: "దశ 6: వ్యాపార సారాంశం", cmd: "ఈరోజు వ్యాపారం ఎలా ఉంది?" },
];

export default function VoicePage() {
  const {
    state,
    transcript,
    messages,
    language,
    setLanguage,
    isSupported,
    startListening,
    stopListening,
    processCommand,
    speak,
    stopSpeaking,
    piperStatus,
    pendingConfirmation,
    confirmPending,
    cancelConversation,
    clearConversation,
  } = useVoice();

  const [textInput, setTextInput] = useState("");

  const handleMicClick = () => {
    if (state === "listening") {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || state === "processing") return;
    processCommand(textInput.trim());
    setTextInput("");
  };

  const handleQuickCommand = (cmd: string) => {
    processCommand(cmd);
  };

  const activeDemoCommands = language === "te-IN" ? DEMO_COMMANDS_TE : DEMO_COMMANDS_EN;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Voice Room Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Interactive AI Voice Agent
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          {language === "te-IN" ? "షాప్‌మేట్ తో మాట్లాడండి" : "Speak to ShopMate"}
        </h2>
        <p className="text-xs md:text-sm text-slate-500 max-w-lg mx-auto">
          {language === "te-IN"
            ? "సహజమైన తెలుగు లేదా ఇంగ్లీషులో ఆదేశాలు ఇవ్వండి. సరుకులు, అమ్మకాలు, ఖాతా వివరాలు తక్షణమే అప్‌డేట్ అవుతాయి."
            : "Natural Indian Kirana commands in Telugu or English. Your shop updates instantly."}
        </p>

        {/* Language & Voice Pack Selector */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setLanguage("te-IN")}
            className={cn(
              "px-4 py-2 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2",
              language === "te-IN"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            <span>🇮🇳 తెలుగు</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px]",
              language === "te-IN" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600"
            )}>Venkatesh Voice Pack</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en-IN")}
            className={cn(
              "px-4 py-2 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2",
              language === "en-IN"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            <span>Indian English</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px]",
              language === "en-IN" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600"
            )}>en-IN</span>
          </button>
        </div>
      </div>

      {/* Main Mic Stage Card */}
      <div className="p-8 md:p-12 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Animated Background Aura for listening / processing */}
        {state === "listening" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-72 rounded-full bg-blue-500/10 animate-ping duration-1000" />
            <div className="w-56 h-56 rounded-full bg-blue-500/15 animate-pulse" />
          </div>
        )}

        {state === "processing" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-amber-500/15 animate-pulse" />
          </div>
        )}

        {/* Hero Mic Button */}
        <button
          onClick={handleMicClick}
          disabled={state === "processing"}
          aria-label="Tap to speak to ShopMate"
          className={cn(
            "relative z-10 w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-400 active:scale-95",
            state === "idle" &&
              "bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white shadow-blue-600/30 hover:scale-105",
            state === "listening" &&
              "bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-600/40 scale-105 animate-pulse",
            state === "processing" &&
              "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/40 animate-spin",
            state === "awaiting_confirmation" &&
              "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/40",
            state === "success" &&
              "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30 scale-105",
            state === "error" &&
              "bg-gradient-to-tr from-rose-600 to-red-600 text-white shadow-rose-600/30"
          )}
        >
          {state === "listening" ? (
            <MicOff className="w-12 h-12 md:w-16 md:h-16" />
          ) : (
            <Mic className="w-12 h-12 md:w-16 md:h-16" />
          )}
        </button>

        {/* State Label & Subtext */}
        <div className="mt-6 z-10">
          <div className="text-lg md:text-xl font-black text-slate-900">
            {state === "idle" && (language === "te-IN" ? "మాట్లాడటానికి నొక్కండి" : "Tap to Speak")}
            {state === "listening" && (language === "te-IN" ? "వింటున్నాను..." : "Listening...")}
            {state === "processing" && (language === "te-IN" ? "అర్థం చేసుకుంటున్నాను..." : "Understanding...")}
            {state === "speaking" && (language === "te-IN" ? "షాప్‌మేట్ మాట్లాడుతోంది..." : "ShopMate is speaking…")}
            {state === "awaiting_confirmation" && (language === "te-IN" ? "దయచేసి నిర్ధారించండి" : "Please confirm")}
            {state === "success" && (language === "te-IN" ? "విజయవంతంగా పూర్తయింది!" : "Action Completed!")}
            {state === "error" && (language === "te-IN" ? "అర్థం కాలేదు, మళ్ళీ ప్రయత్నించండి" : "Couldn't understand, try again")}
          </div>

          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-sm">
            {state === "idle" && (language === "te-IN" ? "మైక్రోఫోన్ పై నొక్కి సహజంగా మాట్లాడండి." : "Click the microphone and speak your transaction naturally.")}
            {state === "listening" && (transcript ? `"${transcript}"` : (language === "te-IN" ? "మైక్రోఫోన్ లో స్పష్టంగా మాట్లాడండి..." : "Speak clearly into your microphone..."))}
            {state === "processing" && (language === "te-IN" ? "వ్యాపార సమాచారాన్ని ప్రాసెస్ చేస్తోంది..." : "Processing business intent and updating database...")}
            {state === "speaking" && (language === "te-IN" ? "మాట్లాడటం పూర్తయిన తర్వాత మీ సమాధానం వింటాను." : "I’ll listen for your reply when I finish speaking.")}
            {state === "awaiting_confirmation" && (language === "te-IN" ? "🎙️ 'అవును' లేదా 'వద్దు' అని మైక్రోఫోన్ లో చెప్పండి." : "🎙️ Voice confirmation: Speak 'Avunu / Yes' or 'Vaddu / Cancel'.")}
            {state === "success" && (language === "te-IN" ? "మీ దుకాణ రికార్డులు విజయవంతంగా అప్‌డేట్ చేయబడ్డాయి." : "Your business records were successfully updated.")}
            {state === "error" && (language === "te-IN" ? "దయచేసి స్పష్టంగా మాట్లాడండి లేదా కింద ఉన్న బాక్స్ లో టైప్ చేయండి." : "Please speak clearly or use the text box below.")}
          </p>
        </div>

        {!isSupported && (
          <div className="mt-4 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
            Speech recognition not available. Please use the typed input fallback below.
          </div>
        )}

        <div className="mt-4 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium flex items-center gap-2 flex-wrap justify-center">
          <span className="font-bold text-slate-700">Voice Pack:</span>
          <span>{piperStatus.detail}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            {language === "te-IN" ? "Telugu Mode Active" : "English Mode Active"}
          </span>
        </div>
      </div>

      {/* Quick Demo Script Shortcuts (Exact Kirana Flow Steps) */}
      <div className="p-4 md:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            {language === "te-IN" ? "తెలుగు డెమో ఆదేశాలు (క్లిక్ చేసి పరీక్షించండి)" : "Interactive Kirana Commands (Click to Test)"}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">1-Click Test</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {activeDemoCommands.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickCommand(item.cmd)}
              disabled={state === "processing"}
              className="p-3 text-left rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-300 transition-all text-xs group"
            >
              <div className="font-bold text-blue-700 text-[11px] mb-0.5">{item.label}</div>
              <div className="text-slate-800 group-hover:text-blue-900 font-medium truncate">
                &ldquo;{item.cmd}&rdquo;
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Typed Input Fallback */}
      <form onSubmit={handleTextSubmit} className="flex gap-2">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={
            language === "te-IN"
              ? "లేదా టైప్ చేయండి (ఉదా: రమేష్ 2 కేజీల బియ్యం ఖాతాలో తీసుకున్నాడు)..."
              : "Or type a command (e.g. Ramesh took 2 kilos of rice on khata)..."
          }
          disabled={state === "processing"}
          className="flex-1 px-4 py-3.5 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!textInput.trim() || state === "processing"}
          className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
        >
          <span>{language === "te-IN" ? "పంపు" : "Send"}</span>
          <Send className="w-4 h-4" />
        </button>
      </form>

      <button
        type="button"
        onClick={stopSpeaking}
        className="mx-auto text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
      >
        <VolumeX className="w-3.5 h-3.5" />
        {language === "te-IN" ? "వాయిస్ ఆపండి" : "Stop assistant voice"}
      </button>

      {pendingConfirmation && (
        <div className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/90 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              {language === "te-IN"
                ? "🎙️ వాయిస్ నిర్ధారణ: మైక్రోఫోన్ లో 'అవును' లేదా 'వద్దు' అని చెప్పండి:"
                : "🎙️ Voice Confirmation Required — Speak 'Avunu / Yes' or 'Vaddu / Cancel':"}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {language === "te-IN"
                ? "మీరు నిర్ధారించే వరకు షాప్ రికార్డులలో మార్పులు జరగవు."
                : "No change will be recorded until you confirm."}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={confirmPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              {language === "te-IN" ? "అవును, నమోదు చేయి" : "Yes, record it"}
            </button>
            <button
              onClick={cancelConversation}
              className="px-4 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all active:scale-95"
            >
              {language === "te-IN" ? "వద్దు, రద్దు చేయి" : "No, cancel"}
            </button>
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <button
          type="button"
          onClick={clearConversation}
          className="mx-auto block text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          {language === "te-IN" ? "సంభాషణను తొలగించు" : "Clear conversation"}
        </button>
      )}

      {/* Conversation History & Live Response Cards */}
      {messages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {language === "te-IN" ? "సంభాషణ చరిత్ర (Conversation History)" : "Recent Conversation"}
          </h3>

          <div className="space-y-3">
            {[...messages].reverse().map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all",
                    isUser
                      ? "bg-slate-100/80 border-slate-200 ml-8 text-slate-800"
                      : "bg-white border-blue-200 shadow-sm mr-8 text-slate-900"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-wider",
                        isUser ? "text-slate-500" : "text-blue-600 flex items-center gap-1"
                      )}
                    >
                      {!isUser && <Sparkles className="w-3 h-3" />}
                      {isUser
                        ? (language === "te-IN" ? "మీరు చెప్పారు" : "You Spoke")
                        : "ShopMate AI (తెలుగు / English)"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(msg.timestamp)}
                    </span>
                  </div>

                  {/* Primary text display with Telugu script highlight */}
                  {msg.teluguText ? (
                    <div className="space-y-1">
                      <p className="text-sm md:text-base font-semibold text-slate-900 leading-relaxed">
                        {msg.teluguText}
                      </p>
                      <p className="text-xs text-slate-500 italic">
                        {msg.text}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                  )}

                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                      <button
                        onClick={() => speak(msg.teluguText || msg.text, msg.teluguText ? "te-IN" : language)}
                        className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>
                          {msg.teluguText
                            ? "వాయిస్ మళ్ళీ వినండి (Telugu Voice Pack)"
                            : "Replay Voice"}
                        </span>
                      </button>

                      {msg.status === "executed" && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{language === "te-IN" ? "డేటాబేస్ అప్‌డేట్ అయింది" : "Database Updated"}</span>
                        </span>
                      )}

                      {msg.status === "failed" && (
                        <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{language === "te-IN" ? "ప్రక్రియ విఫలమైంది" : "Operation Failed"}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
