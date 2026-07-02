package com.centrechretienberakah.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

/**
 * Service PREMIER PLAN maintenu pendant un appel CCB Meet.
 *
 * Sans lui, quand l'écran se verrouille / se met en veille, Android suspend le
 * processus WebView → le micro et le son de l'appel se coupent. Ce service
 * (type « microphone ») + un WakeLock partiel gardent l'appel actif écran
 * éteint, exactement comme la notification « Appel en cours » de WhatsApp.
 *
 * Piloté depuis le web via le pont JS `window.CcbCall` (cf. MainActivity) :
 *   - CcbCall.start()  quand un appel devient actif
 *   - CcbCall.stop()   quand l'appel se termine
 */
public class CallForegroundService extends Service {

    private static final int NOTIF_ID = 424243;
    // NB : nouvel ID de canal (les canaux sont IMMUABLES une fois créés) →
    // garantit que les réglages « visible sur écran verrouillé » s'appliquent
    // même sur un téléphone ayant déjà installé une version précédente.
    private static final String CHANNEL = "ccb_call_ongoing";
    public static final String ACTION_START = "com.centrechretienberakah.app.CALL_FGS_START";
    public static final String ACTION_STOP = "com.centrechretienberakah.app.CALL_FGS_STOP";

    private PowerManager.WakeLock wakeLock;

    public static void start(Context ctx) {
        Intent i = new Intent(ctx, CallForegroundService.class);
        i.setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i);
        else ctx.startService(i);
    }

    public static void stop(Context ctx) {
        Intent i = new Intent(ctx, CallForegroundService.class);
        i.setAction(ACTION_STOP);
        try { ctx.startService(i); } catch (Exception ignored) { }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_STOP.equals(action)) {
            releaseWakeLock();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        ensureChannel();
        Notification notif = buildNotification();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } else {
                startForeground(NOTIF_ID, notif);
            }
        } catch (Exception e) {
            // Si le type microphone est refusé (permission non accordée), on
            // retombe sur un premier plan simple plutôt que de planter.
            try { startForeground(NOTIF_ID, notif); } catch (Exception ignored) { }
        }
        acquireWakeLock();
        // START_STICKY : si le système tue le service, il le relance (appel long).
        return START_STICKY;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            // IMPORTANCE_DEFAULT (et non LOW) : certains constructeurs masquent
            // les notifications de faible importance de l'écran verrouillé. On
            // reste SILENCIEUX (pas de son ni vibration) via le canal.
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL, "Appel en cours", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Notification affichée pendant un appel CCB Meet");
            ch.setShowBadge(false);
            ch.setSound(null, null);
            ch.enableVibration(false);
            // Contenu VISIBLE sur l'écran verrouillé (sinon masqué/redacté).
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, piFlags);

        return new NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Appel CCB en cours")
                .setContentText("Appuyez pour revenir à l'appel")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                // Visible sur l'écran verrouillé, sur tous les téléphones.
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setSilent(true)
                .setContentIntent(pi)
                .build();
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) return;
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ccb:call");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(60 * 60 * 1000L); // garde-fou 1 h
        } catch (Exception ignored) { }
    }

    private void releaseWakeLock() {
        try { if (wakeLock != null && wakeLock.isHeld()) wakeLock.release(); } catch (Exception ignored) { }
        wakeLock = null;
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
