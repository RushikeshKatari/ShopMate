"use client";

import { useState } from "react";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { useVoice } from "@/lib/voice/useVoice";
import { cn, formatDateTime } from "@/lib/utils";

const DEMO_COMMANDS = [
  { label: "Step 1: Purchase", cmd: "I bought 10 kilos of rice for ₹520" },
  { label: "Step 2: Pricing", cmd: "I want ₹10 profit per kilo on rice" },
  { label: "Step 3: Query", cmd: "What is the selling price of rice?" },
  { label: "Step 4: Khata Credit", cmd: "Ramesh took 2 kilos of rice on khata" },
  { label: "Step 5: Payment", cmd: "Ramesh paid ₹124" },
  { label: "Step 6: Min Stock", cmd: "Maintain minimum 10 kilos of rice" },
];

export default function VoicePage() {
  const {
    state,
    transcript,
    messages,
    isSupported,
    startListening,
    stopListening,
    processCommand,
    speak,
  } = useVoice();

  const [textInput, setTextInput] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Voice Room Header */}
      <div className="text-center space-y-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          AI Voice Assistant
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          Speak to ShopMate
        </h2>
        <p className="text-xs md:text-sm text-slate-500 max-w-lg mx-auto">
          Natural Indian Kirana commands in English or Hinglish. Your shop updates instantly.
        </p>
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
            {state === "idle" && "Tap to Speak"}
            {state === "listening" && "Listening..."}
            {state === "processing" && "Understanding..."}
            {state === "success" && "Action Completed!"}
            {state === "error" && "Couldn't understand, try again"}
          </div>

          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-sm">
            {state === "idle" && "Click the microphone and speak your transaction naturally."}
            {state === "listening" && (transcript ? `"${transcript}"` : "Speak clearly into your microphone...")}
            {state === "processing" && "Processing business intent and updating database..."}
            {state === "success" && "Your business records were successfully updated."}
            {state === "error" && "Please speak clearly or use the text box below."}
          </p>
        </div>

        {!isSupported && (
          <div className="mt-4 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
            Browser speech recognition not supported in this browser. Please use the typed input fallback below.
          </div>
        )}
      </div>

      {/* Quick Demo Script Shortcuts (Exact Hackathon Flow Steps) */}
      <div className="p-4 md:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Hackathon 6-Step Demo Shortcuts
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Click to test instantly</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {DEMO_COMMANDS.map((item, idx) => (
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
          placeholder="Or type a command (e.g. Ramesh took 2 kilos of rice on khata)..."
          disabled={state === "processing"}
          className="flex-1 px-4 py-3.5 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!textInput.trim() || state === "processing"}
          className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
        >
          <span>Send</span>
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Conversation History & Live Response Cards */}
      {messages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Recent Conversation
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
                      {isUser ? "You Spoke" : "ShopMate AI"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(msg.timestamp)}
                    </span>
                  </div>

                  <p className="text-sm font-medium leading-relaxed">{msg.text}</p>

                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => speak(msg.text)}
                        className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Replay Voice</span>
                      </button>

                      {msg.status === "executed" && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Database Updated</span>
                        </span>
                      )}

                      {msg.status === "failed" && (
                        <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Operation Failed</span>
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
