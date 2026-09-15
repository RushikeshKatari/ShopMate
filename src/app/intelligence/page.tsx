"use client";
import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";

interface Forecast {
  productName: string;
  unit: string;
  currentStock: number;
  avg7Day: number;
  avg30Day: number;
  velocityTrend: "rising" | "falling" | "stable";
  daysUntilStockout: number | null;
  predictedReorderDate: string | null;
  weeklyRevenue: number;
  monthlyRevenue: number;
  demandScore: number;
}

interface CustomerRisk {
  name: string;
  outstandingBalance: number;
  totalCredit: number;
  riskScore: number;
}

interface Insights {
  forecasts: Forecast[];
  customerRisks: CustomerRisk[];
  topProducts: Forecast[];
  lowStock: { name: string; currentStock: number; minimumStock: number }[];
  weeklyRevenue: number;
  totalOutstanding: number;
  corpusSize: number;
}

const TrendIcon = ({ trend }: { trend: string }) =>
  trend === "rising" ? <span className="text-green-500">▲</span> :
  trend === "falling" ? <span className="text-red-500">▼</span> :
  <span className="text-gray-400">—</span>;

const DemandBar = ({ score }: { score: number }) => (
  <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
    <div
      className="h-2 rounded-full transition-all"
      style={{
        width: `${score}%`,
        background: score > 70 ? "#22c55e" : score > 40 ? "#f59e0b" : "#3b82f6",
      }}
    />
  </div>
);

export default function IntelligencePage() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [ragQuery, setRagQuery] = useState("");
  const [ragResults, setRagResults] = useState<{ text: string; similarity: number }[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    fetch("/api/rag/insights")
      .then(r => r.json())
      .then(d => { if (d.success) setInsights(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const runRagQuery = async () => {
    if (!ragQuery.trim()) return;
    setRagLoading(true);
    const res = await fetch(`/api/rag/similar-transactions?q=${encodeURIComponent(ragQuery)}&k=5`);
    const data = await res.json();
    if (data.success) setRagResults(data.data);
    setRagLoading(false);
  };

  const PIPELINE_STEPS = [
    {
      step: "R — Retrieve",
      icon: "🔍",
      color: "blue",
      desc: "Query shop's SQLite transaction history using TF-IDF cosine similarity",
      detail: `Corpus size: ${insights?.corpusSize ?? "..."} transaction documents indexed`,
    },
    {
      step: "A — Augment",
      icon: "⚡",
      color: "purple",
      desc: "Inject retrieved context: demand forecast, customer risk, sales velocity",
      detail: "7-day & 30-day moving average ML + anomaly detection",
    },
    {
      step: "G — Generate",
      icon: "🗣️",
      color: "green",
      desc: "Local NLP generates context-aware voice response with shop intelligence",
      detail: "\"Rice sold. ⚠️ Stock lasts ~3 days at current velocity.\"",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Navigation />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-24 md:pb-6">

          {/* RAG Pipeline Visualizer */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">🧠 RAG Pipeline</h2>
            <p className="text-xs text-gray-500 mb-4">Retrieve → Augment → Generate — powers every voice command</p>
            <div className="flex flex-col md:flex-row gap-3">
              {PIPELINE_STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-xl p-4 border-2 cursor-pointer transition-all ${
                    activeSlide === i
                      ? s.color === "blue" ? "border-blue-500 bg-blue-50"
                        : s.color === "purple" ? "border-purple-500 bg-purple-50"
                        : "border-green-500 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  onClick={() => setActiveSlide(i)}
                >
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="font-bold text-sm text-gray-900">{s.step}</div>
                  <div className="text-xs text-gray-600 mt-1">{s.desc}</div>
                  {activeSlide === i && (
                    <div className={`mt-2 text-xs font-medium ${
                      s.color === "blue" ? "text-blue-700" : s.color === "purple" ? "text-purple-700" : "text-green-700"
                    }`}>{s.detail}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading AI insights...</div>
          ) : (
            <>
              {/* Top Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-xs text-gray-500">Weekly Revenue</div>
                  <div className="text-2xl font-bold text-green-600">₹{insights?.weeklyRevenue.toLocaleString("en-IN")}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-xs text-gray-500">Total Outstanding</div>
                  <div className="text-2xl font-bold text-orange-500">₹{insights?.totalOutstanding.toLocaleString("en-IN")}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-xs text-gray-500">RAG Corpus</div>
                  <div className="text-2xl font-bold text-blue-600">{insights?.corpusSize}</div>
                  <div className="text-xs text-gray-400">documents indexed</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-xs text-gray-500">Low Stock Items</div>
                  <div className="text-2xl font-bold text-red-500">{insights?.lowStock.length}</div>
                </div>
              </div>

              {/* Demand Forecast */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-1">📈 Demand Forecast (ML)</h2>
                <p className="text-xs text-gray-500 mb-4">7-day & 30-day moving average · sales velocity · predicted stockout</p>
                <div className="space-y-4">
                  {(insights?.forecasts ?? []).map((f, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-800">{f.productName}</div>
                        <div className="flex items-center gap-2">
                          <TrendIcon trend={f.velocityTrend} />
                          <span className="text-xs text-gray-500 capitalize">{f.velocityTrend}</span>
                          {f.daysUntilStockout !== null && f.daysUntilStockout <= 5 && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              ⚠️ {f.daysUntilStockout}d left
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-gray-600">
                        <div><span className="text-gray-400">7-day avg</span><br /><b>{f.avg7Day} {f.unit}/day</b></div>
                        <div><span className="text-gray-400">Stock</span><br /><b>{f.currentStock} {f.unit}</b></div>
                        <div><span className="text-gray-400">Weekly rev</span><br /><b>₹{f.weeklyRevenue}</b></div>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                          <span>Demand score</span><span>{f.demandScore}/100</span>
                        </div>
                        <DemandBar score={f.demandScore} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Risk Scores */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-1">👥 Customer Credit Risk (ML)</h2>
                <p className="text-xs text-gray-500 mb-4">Risk score = outstanding ÷ total credit issued</p>
                <div className="space-y-3">
                  {(insights?.customerRisks ?? []).map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-shopmate-100 flex items-center justify-center text-shopmate-700 font-bold text-sm">
                        {c.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-800">{c.name}</span>
                          <span className={`text-xs font-bold ${c.riskScore > 60 ? "text-red-600" : c.riskScore > 30 ? "text-orange-500" : "text-green-600"}`}>
                            {c.riskScore > 60 ? "High" : c.riskScore > 30 ? "Med" : "Low"} risk
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div className="h-1.5 rounded-full" style={{
                            width: `${c.riskScore}%`,
                            background: c.riskScore > 60 ? "#ef4444" : c.riskScore > 30 ? "#f59e0b" : "#22c55e"
                          }} />
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">Outstanding ₹{c.outstandingBalance} · Credit issued ₹{c.totalCredit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RAG Query Explorer */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-1">🔍 RAG Query Explorer</h2>
                <p className="text-xs text-gray-500 mb-4">Type any question — watch Retrieve → results from your shop's transaction corpus</p>
                <div className="flex gap-2">
                  <input
                    value={ragQuery}
                    onChange={e => setRagQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && runRagQuery()}
                    placeholder="e.g. rice purchase, Ramesh credit, UPI payment..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-shopmate-500"
                  />
                  <button
                    onClick={runRagQuery}
                    disabled={ragLoading}
                    className="bg-shopmate-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-shopmate-700 disabled:opacity-50"
                  >
                    {ragLoading ? "..." : "Retrieve"}
                  </button>
                </div>
                {ragResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Retrieved Documents (TF-IDF Similarity)</div>
                    {ragResults.map((r, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs border border-gray-100">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-400">#{i + 1}</span>
                          <span className="font-mono text-blue-600">score: {r.similarity.toFixed(3)}</span>
                        </div>
                        <div className="text-gray-700">{r.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tech Stack Badge */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-5 text-white">
                <div className="font-bold text-lg mb-2">🚀 ShopMate AI Stack</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {[
                    ["🧠 NLP", "Local intent classifier, fuzzy entity matching, Hinglish + Telugu"],
                    ["📊 ML", "Moving average demand forecasting, customer risk scoring"],
                    ["🔍 RAG", "TF-IDF vector store, cosine similarity, retrieval-augmented responses"],
                    ["💰 Fintech", "Khata ledger, UPI payments, credit scoring, cash flow"],
                    ["🎤 Voice", "Web Speech API, STT + TTS, en-IN dialect"],
                    ["📴 Offline", "IndexedDB queue, background sync"],
                  ].map(([title, desc], i) => (
                    <div key={i} className="bg-white/10 rounded-lg p-3">
                      <div className="font-semibold">{title}</div>
                      <div className="text-xs text-white/80 mt-1">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
