package com.centrechretienberakah.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Réception des messages FCM (Phase 2 · Étape 2).
 *
 * - Message "data" type=call  → écran d'appel PLEIN FORMAT (même app tuée/verrouillée),
 *   via un fullScreenIntent sur le canal "calls" (importance URGENT).
 * - Autres messages (notifications classiques avec bloc "notification") : affichés
 *   par le système Android quand l'app est en arrière-plan → rien à faire ici.
 *
 * Le token FCM reste enregistré par le plugin Capacitor (getToken côté JS, Étape 1) ;
 * ce service n'a donc pas besoin de gérer onNewToken.
 */
public class CallMessagingService extends FirebaseMessagingService {

    private static final String CALLS_CHANNEL = "calls";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        if (data != null && "call".equals(data.get("type"))) {
            showIncomingCall(data);
        }
    }

    private void ensureCallsChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            NotificationChannel ch = new NotificationChannel(
                    CALLS_CHANNEL, "Appels", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Appels audio et vidéo entrants");
            ch.enableVibration(true);
            ch.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }

    private void showIncomingCall(Map<String, String> data) {
        ensureCallsChannel();

        String callId = data.get("callId");
        int id = callId != null ? callId.hashCode() : (int) System.currentTimeMillis();

        Intent full = new Intent(this, IncomingCallActivity.class);
        full.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        for (Map.Entry<String, String> e : data.entrySet()) {
            full.putExtra(e.getKey(), e.getValue());
        }

        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent fullPI = PendingIntent.getActivity(this, id, full, piFlags);

        String groupName = data.get("groupName");
        String callerName = data.get("callerName");
        String title = (groupName != null && !groupName.isEmpty())
                ? ("Le groupe " + groupName + " vous appelle")
                : (callerName != null ? callerName : "Appel entrant");
        String text = "video".equals(data.get("callType")) ? "Appel vidéo entrant" : "Appel audio entrant";

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CALLS_CHANNEL)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(text)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setOngoing(true)
                .setAutoCancel(true)
                .setContentIntent(fullPI)
                .setFullScreenIntent(fullPI, true);

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(id, b.build());
    }
}
