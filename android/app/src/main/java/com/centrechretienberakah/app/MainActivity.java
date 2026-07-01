package com.centrechretienberakah.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.BridgeActivity;

/**
 * Activité principale Capacitor (WebView).
 *
 * Ajout Phase 2 · Étape 2 : quand on ACCEPTE un appel entrant, IncomingCallActivity
 * lance cette activité avec l'extra "openUrl" (le chemin de la page d'appel). On
 * charge alors cette URL dans la WebView → LiveKit rejoint la salle.
 */
public class MainActivity extends BridgeActivity {

    // Doit correspondre au domaine de production (capacitor.config.ts → server.url).
    private static final String PROD_URL = "https://centrechretienberakah.com";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleOpenUrl(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleOpenUrl(intent);
    }

    private void handleOpenUrl(Intent intent) {
        if (intent == null) return;
        final String openUrl = intent.getStringExtra("openUrl");
        if (openUrl == null || openUrl.isEmpty()) return;
        final String full = openUrl.startsWith("http") ? openUrl : (PROD_URL + openUrl);

        // Laisse le bridge/WebView s'initialiser puis navigue vers la page d'appel.
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override public void run() {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().loadUrl(full);
                    }
                } catch (Exception ignored) { }
            }
        }, 400);
    }
}
