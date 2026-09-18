# Packaged Piper voice

`te_IN-venkatesh-medium.onnx` and its `.onnx.json` configuration are the
matching Telugu Piper voice assets supplied for ShopMate.

The Next.js browser application cannot execute Piper ONNX inference on its
own. `src/lib/voice/piper.ts` is the interface used by the voice UI: an Android
wrapper must provide `window.ShopMatePiper.speak()` and `stop()`, load this
exact model/config pair from the app bundle, synthesize off the UI thread, and
play the resulting PCM/WAV audio. Until that native bridge is installed, the
UI honestly reports that the model is packaged and uses the device system TTS
fallback.

This is a Telugu model. The adapter selects it only for Telugu-script output;
English replies continue through the device voice unless a matching English
Piper voice is added.
