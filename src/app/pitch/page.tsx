"use client";
import { useState } from "react";

const slides = [
  {
    id: 1,
    label: "Problem",
    emoji: "😤",
    bg: "from-red-600 to-orange-600",
    title: "63 Million Shops. Zero Digital Tools.",
    subtitle: "India's kirana problem",
    body: [
      "63M+ small retail/kirana shops across India",
      "90% still run on paper khata & oral records",
      "₹40 lakh crore in annual retail — invisible to fintech",
      "No inventory tracking → over-ordering, spoilage, stockouts",
      "Manual credit ledger → bad debts, no cash flow visibility",
    ],
    stat: { value: "63M+", label: "shops with no digital tools" },
    accent: "bg-red-500",
  },
  {
    id: 2,
    label: "Solution",
    emoji: "🎤",
    bg: "from-blue-600 to-cyan-600",
    title: "Speak → AI Understands → Business Updated.",
    subtitle: "ShopMate: Voice-first AI for kirana shops",
    body: [
      "\"10 kilu biyyam ₹520 ki konnanu\" → inventory updated",
      "\"Ramesh ₹200 chellimpu chesadu\" → khata settled",
      "\"Neti ammakalu enta?\" → daily sales report",
      "Works in English, Hindi (Hinglish), and Telugu",
      "One mic tap replaces hours of manual bookkeeping",
    ],
    stat: { value: "< 3s", label: "to record any transaction by voice" },
    accent: "bg-blue-500",
  },
  {
    id: 3,
    label: "AI / ML",
    emoji: "🧠",
    bg: "from-purple-600 to-indigo-600",
    title: "Real AI. No API. No Cloud.",
    subtitle: "100% on-device intelligence",
    body: [
      "Intent classifier: 9 business intents, 0.98 confidence",
      "Fuzzy entity matching: product & customer names in any spelling",
      "Multi-turn conversation memory for ambiguous commands",
      "Demand forecasting: 7-day & 30-day moving average ML",
      "Customer credit risk scoring from transaction history",
      "Anomaly detection: flags unusual credit amounts (≥₹5,000)",
    ],
    stat: { value: "0ms", label: "network latency — fully offline" },
    accent: "bg-purple-500",
  },
  {
    id: 4,
    label: "RAG",
    emoji: "🔍",
    bg: "from-teal-600 to-green-600",
    title: "Retrieval-Augmented Generation",
    subtitle: "Your shop's history = the knowledge base",
    body: [
      "R — Retrieve: TF-IDF cosine similarity search over transaction corpus",
      "A — Augment: inject demand forecast + customer insight into pipeline",
      "G — Generate: local NLP produces context-aware response",
      "Example: \"Rice sold. ⚠️ Stock lasts ~3 days at current velocity.\"",
      "RAG Explorer: query your corpus live on the Intelligence page",
    ],
    stat: { value: "3-step", label: "local RAG pipeline, no LLM API" },
    accent: "bg-teal-500",
    diagram: true,
  },
  {
    id: 5,
    label: "Fintech",
    emoji: "💰",
    bg: "from-amber-600 to-yellow-600",
    title: "Micro-Fintech for Bharat.",
    subtitle: "Built for the ₹40L crore informal economy",
    body: [
      "Khata ledger: digital credit book with overdraft protection",
      "UPI QR payment terminal: collect debt instantly",
      "Per-product P&L: purchase price, selling price, profit margin",
      "Cash flow analytics: daily/weekly/monthly revenue",
      "Offline-first: works without internet, syncs when connected",
    ],
    stat: { value: "₹18,400", label: "total outstanding tracked in demo" },
    accent: "bg-amber-500",
  },
  {
    id: 6,
    label: "Demo",
    emoji: "🚀",
    bg: "from-shopmate-600 to-blue-700",
    title: "Live. Production. Today.",
    subtitle: "Full-stack MVP — built and shipped",
    body: [
      "Next.js 14 App Router + TypeScript + Tailwind CSS",
      "Prisma ORM + SQLite → Postgres-ready",
      "27 compiled routes, 14/14 tests passing",
      "English + Hinglish + Telugu voice support",
      "Web Speech API: STT + TTS in en-IN dialect",
      "IndexedDB offline queue with background sync",
    ],
    cta: true,
    stat: { value: "14/14", label: "automated tests passing" },
    accent: "bg-shopmate-500",
  },
];

export default function PitchPage() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${slide.bg} transition-all duration-500 flex flex-col`}>
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div className="text-white/80 text-sm font-semibold tracking-widest uppercase">ShopMate</div>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/40"}`}
            />
          ))}
        </div>
        <div className="text-white/60 text-sm">{current + 1} / {slides.length}</div>
      </div>

      {/* Slide tabs */}
      <div className="flex gap-2 px-6 pb-4 overflow-x-auto">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              i === current ? "bg-white text-gray-900" : "bg-white/20 text-white"
            }`}
          >
            <span>{s.emoji}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Main slide */}
      <div className="flex-1 flex flex-col px-6 pb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-10 flex-1 flex flex-col justify-between border border-white/20">
          <div>
            <div className="text-5xl mb-4">{slide.emoji}</div>
            <div className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-2">{slide.subtitle}</div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-6 leading-tight">{slide.title}</h1>

            {/* Body points */}
            <ul className="space-y-3 mb-6">
              {slide.body.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-white/90 text-sm md:text-base">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${slide.accent}`} />
                  {point}
                </li>
              ))}
            </ul>

            {/* RAG diagram inline */}
            {slide.diagram && (
              <div className="bg-white/10 rounded-2xl p-4 mb-4 border border-white/20">
                <div className="flex items-center gap-2 text-white">
                  {[
                    { icon: "🔍", label: "Retrieve", sub: "TF-IDF cosine similarity" },
                    { icon: "→", label: "", sub: "" },
                    { icon: "⚡", label: "Augment", sub: "Demand + risk context" },
                    { icon: "→", label: "", sub: "" },
                    { icon: "🗣️", label: "Generate", sub: "Context-aware response" },
                  ].map((step, i) => (
                    <div key={i} className={`${step.label ? "flex-1" : "text-white/50 text-xl font-bold"} text-center`}>
                      {step.label ? (
                        <>
                          <div className="text-2xl">{step.icon}</div>
                          <div className="text-xs font-bold mt-1">{step.label}</div>
                          <div className="text-xs text-white/60">{step.sub}</div>
                        </>
                      ) : (
                        <div>{step.icon}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stat + CTA */}
          <div className="flex items-center justify-between mt-4">
            <div className="bg-white/20 rounded-2xl px-5 py-3">
              <div className="text-2xl font-black text-white">{slide.stat.value}</div>
              <div className="text-xs text-white/70">{slide.stat.label}</div>
            </div>

            {slide.cta ? (
              <div className="flex gap-2">
                <a href="/dashboard" className="bg-white text-gray-900 font-bold px-4 py-2 rounded-xl text-sm hover:bg-gray-100">
                  Open App →
                </a>
                <a href="/voice" className="bg-white/20 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-white/30 border border-white/30">
                  🎤 Try Voice
                </a>
              </div>
            ) : (
              <div className="flex gap-2">
                {current > 0 && (
                  <button onClick={() => setCurrent(c => c - 1)} className="bg-white/20 text-white px-4 py-2 rounded-xl text-sm">← Back</button>
                )}
                {current < slides.length - 1 && (
                  <button onClick={() => setCurrent(c => c + 1)} className="bg-white text-gray-900 font-bold px-4 py-2 rounded-xl text-sm">Next →</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-4 text-white/40 text-xs">
        ShopMate · AI & ML + Fintech + RAG · Built in India 🇮🇳
      </div>
    </div>
  );
}
