package com.shopmate.app;

import android.Manifest;
import android.content.Context;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.annotation.PluginMethod;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

import ai.vosk.Model;
import ai.vosk.RecognitionListener;
import ai.vosk.Recognizer;
import ai.vosk.android.SpeechService;
import ai.vosk.android.StorageService;

/** Offline Vosk STT bridge. The bundled Indian-English model is copied from
 * assets on first use and listening is stopped/released after every turn. */
@CapacitorPlugin(
    name = "OfflineSpeech",
    permissions = { @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class OfflineSpeechPlugin extends Plugin implements RecognitionListener {
    private static final String MODEL_ASSET_PATH = "models/vosk-model-small-en-in-0.4";
    private Model model;
    private Recognizer recognizer;
    private SpeechService speechService;

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("modelLoaded", model != null);
        result.put("modelAsset", MODEL_ASSET_PATH);
        result.put("microphoneGranted", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "onMicrophonePermission");
            return;
        }
        startListening(call);
    }

    @PermissionCallback
    private void onMicrophonePermission(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission was denied.");
            return;
        }
        startListening(call);
    }

    private void startListening(PluginCall call) {
        stopService();
        if (model != null) {
            beginRecognition(call);
            return;
        }

        StorageService.sync(getContext(), MODEL_ASSET_PATH, "shopmate-vosk-en-in", loadedModel -> {
            model = loadedModel;
            beginRecognition(call);
        }, exception -> call.reject("Offline speech model is missing or could not load: " + exception.getMessage()));
    }

    private void beginRecognition(PluginCall call) {
        try {
            recognizer = new Recognizer(model, 16000.0f);
            speechService = new SpeechService(recognizer, 16000.0f);
            speechService.startListening(this);
            call.resolve();
        } catch (IOException exception) {
            call.reject("Unable to start offline speech recognition: " + exception.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopService();
        call.resolve();
    }

    @Override public void onPartialResult(String hypothesis) { emit("partial", hypothesis, "partial"); }
    @Override public void onResult(String hypothesis) { emit("result", hypothesis, "text"); }
    @Override public void onFinalResult(String hypothesis) { emit("final", hypothesis, "text"); stopService(); }
    @Override public void onError(Exception exception) { notifyListeners("error", new JSObject().put("message", exception.getMessage())); stopService(); }
    @Override public void onTimeout() { notifyListeners("timeout", new JSObject()); stopService(); }

    private void emit(String event, String hypothesis, String key) {
        try {
            String text = new JSONObject(hypothesis).optString(key, "").trim();
            if (!text.isEmpty()) notifyListeners(event, new JSObject().put("text", text));
        } catch (JSONException ignored) { }
    }

    private void stopService() {
        if (speechService != null) { speechService.stop(); speechService.shutdown(); speechService = null; }
        if (recognizer != null) { recognizer.close(); recognizer = null; }
    }

    @Override protected void handleOnDestroy() {
        stopService();
        if (model != null) { model.close(); model = null; }
        super.handleOnDestroy();
    }
}
