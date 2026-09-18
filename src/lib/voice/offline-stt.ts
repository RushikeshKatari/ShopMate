import { Capacitor, PluginListenerHandle, registerPlugin } from "@capacitor/core";

type OfflineSpeechPlugin = {
  status(): Promise<{ modelLoaded: boolean; modelAsset: string; microphoneGranted: boolean }>;
  start(): Promise<void>;
  stop(): Promise<void>;
  addListener(eventName: "partial" | "result" | "final" | "error" | "timeout", listener: (event: { text?: string; message?: string }) => void): Promise<PluginListenerHandle>;
};

const nativeSpeech = registerPlugin<OfflineSpeechPlugin>("OfflineSpeech");

export const OfflineSTT = {
  available: () => Capacitor.isNativePlatform(),
  status: () => nativeSpeech.status(),
  start: () => nativeSpeech.start(),
  stop: () => nativeSpeech.stop(),
  on: (event: "partial" | "result" | "final" | "error" | "timeout", listener: (payload: { text?: string; message?: string }) => void) => nativeSpeech.addListener(event, listener),
};
