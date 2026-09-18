package com.shopmate.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(OfflineSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
