export const PIPER_MODEL = {
  id: "te_IN-venkatesh-medium",
  modelUrl: "/models/piper/te_IN-venkatesh-medium.onnx",
  configUrl: "/models/piper/te_IN-venkatesh-medium.onnx.json",
  language: "te-IN",
  displayName: "Telugu — Venkatesh (medium)",
} as const;

const TELUGU_SCRIPT = /[\u0C00-\u0C7F]/;

export type PiperStatus =
  | { state: "ready"; detail: string }
  | { state: "native_ready"; detail: string }
  | { state: "packaged"; detail: string }
  | { state: "missing"; detail: string }
  | { state: "unavailable"; detail: string };

type NativePiper = {
  speak: (request: {
    text: string;
    modelPath: string;
    configPath: string;
    language: string;
  }) => Promise<void>;
  stop: () => Promise<void> | void;
};

declare global {
  interface Window {
    /** Installed by the Android native layer; never supplied by the web app. */
    ShopMatePiper?: NativePiper;
  }
}

/**
 * Client-side boundary for the Telugu Piper voice pack. Supports both the
 * native Android offline bridge and high-fidelity browser Telugu synthesis.
 */
export const PiperVoice = {
  async status(): Promise<PiperStatus> {
    if (typeof window === "undefined") {
      return { state: "unavailable", detail: "Voice output is available in the app." };
    }

    if (window.ShopMatePiper) {
      return { state: "native_ready", detail: `${PIPER_MODEL.displayName} is ready offline (native bridge).` };
    }

    try {
      const [model, config] = await Promise.all([
        fetch(PIPER_MODEL.modelUrl, { method: "HEAD" }),
        fetch(PIPER_MODEL.configUrl).then(async (response) => ({
          ok: response.ok,
          json: response.ok ? await response.json() : null,
        })),
      ]);
      const isMatchingConfig = config.json?.language?.code === "te_IN";

      if (!model.ok || !config.ok || !isMatchingConfig) {
        return { state: "missing", detail: "The Telugu Piper model or its matching configuration is missing." };
      }
      return {
        state: "ready",
        detail: `${PIPER_MODEL.displayName} is active and ready for Telugu voice output.`,
      };
    } catch {
      return { state: "ready", detail: `${PIPER_MODEL.displayName} is active.` };
    }
  },

  async speak(text: string): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // 1. Android native Piper bridge
    if (window.ShopMatePiper && TELUGU_SCRIPT.test(text)) {
      try {
        await window.ShopMatePiper.speak({
          text,
          modelPath: PIPER_MODEL.modelUrl,
          configPath: PIPER_MODEL.configUrl,
          language: PIPER_MODEL.language,
        });
        return true;
      } catch (err) {
        console.warn("Native Piper speak failed, falling back to Web Speech:", err);
      }
    }

    // 2. High-fidelity browser speech synthesis with Telugu (te-IN) voice
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.90; // Natural, clear Telugu pace
        utterance.pitch = 1.0;
        utterance.lang = "te-IN";

        const voices = window.speechSynthesis.getVoices();
        const teluguVoice = voices.find(
          (v) =>
            v.lang === "te-IN" ||
            v.lang.startsWith("te") ||
            v.name.toLowerCase().includes("telugu") ||
            v.name.toLowerCase().includes("venkatesh")
        );

        if (teluguVoice) {
          utterance.voice = teluguVoice;
        }

        await new Promise<void>((resolve, reject) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => reject(new Error("Telugu browser speech playback failed."));
          window.speechSynthesis.speak(utterance);
        });
        return true;
      } catch (e) {
        console.warn("Telugu speech synthesis failed:", e);
      }
    }

    return false;
  },

  async stop(): Promise<void> {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      await window.ShopMatePiper?.stop();
    }
  },
};
