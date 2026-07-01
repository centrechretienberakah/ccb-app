package com.centrechretienberakah.app;

import android.app.NotificationManager;
import android.content.Context;
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

        // On a accepté depuis la notification → on ferme la notif d'appel.
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(CallMessagingService.CALL_NOTIF_ID);
        } catch (Exception ignored) { }

        // Charge la page d'appel dès que la WebView est prête (réessaie si besoin,
        // pour couvrir le démarrage à froid où le bridge n'est pas encore initialisé).
        loadWhenReady(full, 0);
    }

    private void loadWhenReady(final String url, final int attempt) {
        if (attempt > 20) return; // ~6 s max
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override public void run() {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().loadUrl(url);
                        return;
                    }
                } catch (Exception ignored) { }
                loadWhenReady(url, attempt + 1);
            }
        }, 300);
    }
}
