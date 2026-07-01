package com.centrechretienberakah.app;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

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
    // Violet royal CCB — couleur derrière les barres système (barre d'état / nav).
    private static final int FRAME_COLOR = Color.parseColor("#5A2CA0");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBarInsets();
        handleOpenUrl(getIntent());
    }

    /**
     * Empêche le contenu web de passer SOUS la barre d'état / la barre de
     * navigation (Android 15+ force l'« edge-to-edge » : sans ça l'horloge et la
     * batterie recouvrent l'en-tête de l'app — cf. captures utilisateur).
     *
     * On applique les marges (insets) des barres système en PADDING sur la
     * WebView. Sur Android ≤ 14 (pas d'edge-to-edge), le système a déjà décalé
     * le contenu → les insets reçus valent 0, ce code est donc inoffensif. Sur
     * Android 15/16, les insets réels sont appliqués → le contenu descend sous
     * la barre d'état. La zone des barres montre le fond violet de la WebView,
     * ce qui donne une barre d'état violette nette (façon WhatsApp).
     *
     * NB : on ne s'appuie pas sur env(safe-area-inset-*) côté CSS car la WebView
     * Android ne le renseigne pas de façon fiable pour les barres système.
     */
    private void applySystemBarInsets() {
        try {
            // Icônes de la barre d'état en clair (fond violet foncé).
            WindowInsetsControllerCompat ctrl =
                    WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            if (ctrl != null) ctrl.setAppearanceLightStatusBars(false);
            getWindow().getDecorView().setBackgroundColor(FRAME_COLOR);
        } catch (Exception ignored) { }
        attachInsetsListener(0);
    }

    private void attachInsetsListener(final int attempt) {
        if (attempt > 20) return; // ~6 s max, le temps que le bridge s'initialise
        final WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
        if (webView == null) {
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override public void run() { attachInsetsListener(attempt + 1); }
            }, 200);
            return;
        }
        webView.setBackgroundColor(FRAME_COLOR);
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets bars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(webView);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Réaffirme les icônes de barre d'état en clair (le plugin StatusBar peut
        // les remettre en foncé selon sa config à la reprise → illisibles sur violet).
        try {
            WindowInsetsControllerCompat ctrl =
                    WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            if (ctrl != null) ctrl.setAppearanceLightStatusBars(false);
        } catch (Exception ignored) { }
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
