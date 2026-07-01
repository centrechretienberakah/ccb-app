package com.centrechretienberakah.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Space;
import android.widget.TextView;

import java.lang.ref.WeakReference;

/**
 * Écran d'appel entrant PLEIN FORMAT (Phase 2 · Étape 2).
 * - S'affiche par-dessus l'écran verrouillé, réveille l'écran, sonne et vibre.
 * - Boutons Accepter / Refuser GROS, ancrés en bas.
 * - Délai d'expiration (35 s) → arrête la sonnerie même si l'appelant ne signale rien.
 * - Annulation distante possible via cancelCurrent() (l'appelant a raccroché).
 * Accepter → ouvre MainActivity sur l'URL d'appel (WebView → LiveKit).
 */
public class IncomingCallActivity extends Activity {

    private static final long RING_TIMEOUT_MS = 35_000L;

    // Référence à l'écran actuellement affiché (pour l'annulation distante, sans
    // dépendance externe). WeakReference : pas de fuite mémoire.
    private static WeakReference<IncomingCallActivity> current = new WeakReference<>(null);

    /** Ferme l'écran d'appel en cours, s'il y en a un (appelé sur "call-cancel"). */
    public static void cancelCurrent() {
        final IncomingCallActivity a = current.get();
        if (a != null) {
            a.runOnUiThread(new Runnable() {
                @Override public void run() { a.closeCall(); }
            });
        }
    }

    private Ringtone ringtone;
    private Vibrator vibrator;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable timeoutRunnable = new Runnable() {
        @Override public void run() { closeCall(); }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        current = new WeakReference<>(this);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                            | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        final Intent in = getIntent();
        String groupName = in.getStringExtra("groupName");
        String callerName = in.getStringExtra("callerName");
        String callType = in.getStringExtra("callType");
        final String roomUrl = in.getStringExtra("roomUrl");

        String title = (groupName != null && !groupName.isEmpty())
                ? ("Le groupe " + groupName + " vous appelle")
                : (callerName != null && !callerName.isEmpty() ? callerName : "Appel entrant");
        String subtitle = "video".equals(callType) ? "Appel vidéo entrant…" : "Appel audio entrant…";

        setContentView(buildView(title, subtitle, roomUrl));
        startRinging();
        handler.postDelayed(timeoutRunnable, RING_TIMEOUT_MS);
    }

    private View buildView(String title, String subtitle, final String roomUrl) {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#5A2CA0"));
        int pad = dp(24);
        root.setPadding(pad, dp(48), pad, dp(40));
        root.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));

        root.addView(spacer(2));

        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(26);
        tvTitle.setGravity(Gravity.CENTER);

        TextView tvSub = new TextView(this);
        tvSub.setText(subtitle);
        tvSub.setTextColor(Color.parseColor("#E9DFF7"));
        tvSub.setTextSize(16);
        tvSub.setGravity(Gravity.CENTER);
        tvSub.setPadding(0, dp(12), 0, 0);

        root.addView(tvTitle, wrap());
        root.addView(tvSub, wrap());

        root.addView(spacer(3));

        LinearLayout btns = new LinearLayout(this);
        btns.setOrientation(LinearLayout.HORIZONTAL);
        btns.setGravity(Gravity.CENTER);
        btns.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        Button decline = bigButton("Refuser", "#DC2626");
        Button accept = bigButton("Accepter", "#16A34A");

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(64), 1f);
        lp.setMargins(dp(10), 0, dp(10), 0);
        btns.addView(decline, lp);
        btns.addView(accept, lp);

        decline.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { closeCall(); }
        });
        accept.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                stopRinging();
                cancelNotif();
                Intent i = new Intent(IncomingCallActivity.this, MainActivity.class);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                if (roomUrl != null) i.putExtra("openUrl", roomUrl);
                startActivity(i);
                finish();
            }
        });

        root.addView(btns);
        return root;
    }

    private Button bigButton(String text, String colorHex) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextColor(Color.WHITE);
        b.setTextSize(17);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor(colorHex));
        bg.setCornerRadius(dp(999));
        b.setBackground(bg);
        return b;
    }

    private Space spacer(float weight) {
        Space s = new Space(this);
        s.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, weight));
        return s;
    }

    private LinearLayout.LayoutParams wrap() {
        return new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int v) {
        return (int) (v * getResources().getDisplayMetrics().density);
    }

    private void startRinging() {
        try {
            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            ringtone = RingtoneManager.getRingtone(getApplicationContext(), uri);
            if (ringtone != null) ringtone.play();
        } catch (Exception ignored) { }
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 800, 900};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) { }
    }

    private void stopRinging() {
        try { if (ringtone != null) ringtone.stop(); } catch (Exception ignored) { }
        try { if (vibrator != null) vibrator.cancel(); } catch (Exception ignored) { }
    }

    private void cancelNotif() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(CallMessagingService.CALL_NOTIF_ID);
        } catch (Exception ignored) { }
    }

    /** Ferme proprement l'écran d'appel (refus, expiration, ou annulation distante). */
    private void closeCall() {
        stopRinging();
        cancelNotif();
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        handler.removeCallbacks(timeoutRunnable);
        if (current.get() == this) current = new WeakReference<>(null);
        stopRinging();
    }
}
