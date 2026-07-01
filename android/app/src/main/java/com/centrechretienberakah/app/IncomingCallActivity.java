package com.centrechretienberakah.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Écran d'appel entrant PLEIN FORMAT (Phase 2 · Étape 2).
 * S'affiche par-dessus l'écran verrouillé, réveille l'écran, sonne et vibre.
 *
 * Accepter → ouvre MainActivity sur l'URL d'appel (la WebView charge la page
 *            d'appel → LiveKit rejoint la salle).
 * Refuser  → ferme l'écran.
 *
 * UI construite en code (pas de layout XML) pour rester autonome.
 */
public class IncomingCallActivity extends Activity {

    private Ringtone ringtone;
    private Vibrator vibrator;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Afficher au-dessus du verrouillage + allumer l'écran
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
                : (callerName != null ? callerName : "Appel entrant");
        String subtitle = "video".equals(callType) ? "Appel vidéo entrant…" : "Appel audio entrant…";

        setContentView(buildView(title, subtitle, roomUrl));
        startRinging();
    }

    private View buildView(String title, String subtitle, final String roomUrl) {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#5A2CA0"));
        int pad = dp(28);
        root.setPadding(pad, pad, pad, pad);

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
        tvSub.setPadding(0, dp(10), 0, dp(48));

        LinearLayout btns = new LinearLayout(this);
        btns.setOrientation(LinearLayout.HORIZONTAL);
        btns.setGravity(Gravity.CENTER);

        Button decline = new Button(this);
        decline.setText("Refuser");
        decline.setTextColor(Color.WHITE);
        decline.setBackgroundColor(Color.parseColor("#DC2626"));

        Button accept = new Button(this);
        accept.setText("Accepter");
        accept.setTextColor(Color.WHITE);
        accept.setBackgroundColor(Color.parseColor("#16A34A"));

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        lp.setMargins(dp(12), 0, dp(12), 0);
        btns.addView(decline, lp);
        btns.addView(accept, lp);

        decline.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                stopRinging();
                finish();
            }
        });
        accept.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                stopRinging();
                Intent i = new Intent(IncomingCallActivity.this, MainActivity.class);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                if (roomUrl != null) i.putExtra("openUrl", roomUrl);
                startActivity(i);
                finish();
            }
        });

        root.addView(tvTitle);
        root.addView(tvSub);
        root.addView(btns);
        return root;
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

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopRinging();
    }
}
