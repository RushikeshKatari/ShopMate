"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  Store,
  Mic,
  Bell,
  Wifi,
  User,
  LogOut,
  Save,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    shopName: "Ramesh Kirana Store",
    phone: "9876543210",
    address: "Shop #4, Market Road, Bengaluru, Karnataka",
    language: "en-IN",
    currency: "INR",
    voiceEnabled: true,
    voiceResponseEnabled: true,
    lowStockNotifications: true,
    offlineMode: false,
    upiId: "",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings && data.shop) {
            setFormData({
              shopName: data.settings.shopName || data.shop.name,
              phone: data.shop.phone || "",
              address: data.shop.address || "",
              language: data.settings.language || "en-IN",
              currency: data.settings.currency || "INR",
              voiceEnabled: data.settings.voiceEnabled,
              voiceResponseEnabled: data.settings.voiceResponseEnabled,
              lowStockNotifications: data.settings.lowStockNotifications,
              offlineMode: data.settings.offlineMode,
              upiId: data.settings.upiId || "",
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Shop Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure store profile, voice speech preferences, and alerts
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 font-bold text-xs flex items-center gap-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop Profile */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Shop Information</h3>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shop Name
              </label>
              <input
                type="text"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  disabled
                  value="INR (₹)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Address / Location
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* UPI QR recipient */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-5 h-5 text-center text-base leading-5">₹</span>
            <h3 className="text-base font-bold text-slate-900">UPI QR Payments</h3>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Receive payments at this UPI ID
            </label>
            <input
              type="text"
              inputMode="email"
              autoCapitalize="none"
              value={formData.upiId}
              onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
              placeholder="yourshop@bank"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Every QR code will send payment only to this UPI ID. Leave blank to disable QR generation.
            </p>
          </div>
        </div>

        {/* AI & Voice Settings */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Mic className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">AI & Voice Assistant</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Language / Dialect
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="te-IN">తెలుగు — Telugu (Venkatesh Voice Pack Active)</option>
                <option value="en-IN">Indian English + Hinglish</option>
                <option value="hi-IN">Hindi (Coming soon)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                {formData.language === "te-IN"
                  ? "Packaged Voice: te_IN-venkatesh-medium (Telugu TTS active for spoken Kirana replies)"
                  : "Standard Indian English voice synthesizer active."}
              </p>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Voice Recognition Active
                </span>
                <span className="text-[11px] text-slate-400">
                  Allow microphone listening and voice command processing
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.voiceEnabled}
                onChange={(e) => setFormData({ ...formData, voiceEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Audio Speech Feedback (TTS)
                </span>
                <span className="text-[11px] text-slate-400">
                  Speak confirmation messages out loud after commands
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.voiceResponseEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, voiceResponseEnabled: e.target.checked })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notifications & Offline Mode */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Alerts & Offline</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Low Stock Notifications
                </span>
                <span className="text-[11px] text-slate-400">
                  Generate alerts when product levels reach minimum threshold
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.lowStockNotifications}
                onChange={(e) =>
                  setFormData({ ...formData, lowStockNotifications: e.target.checked })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Offline Sync Mode
                </span>
                <span className="text-[11px] text-slate-400">
                  Keep transaction queue locally in IndexedDB when internet disconnects
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.offlineMode}
                onChange={(e) => setFormData({ ...formData, offlineMode: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Save button bar */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved successfully!</span>
            </span>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
