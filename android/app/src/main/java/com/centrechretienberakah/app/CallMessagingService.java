package com.centrechretienberakah.app;

import android.app.KeyguardManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Réception des messages FCM (Phase 2 · Étape 2).
 *
 * - "data" type=call        → écran d'appel PLEIN FORMAT (même app tuée/verrouillée),
 *   via un fullScreenIntent sur le canal "calls" (importance URGENT).
 * - "data" type=call-cancel → l'appelant a raccroché : on ferme l'écran + la notif.
 * - Autres messages (notifications classiques) : affichés par le système Android.
 *
 * Le token FCM reste enregistré par le plugin Capacitor (getToken côté JS, Étape 1).
 */
public class CallMessagingService extends FirebaseMessagingService {

    private static final String CALLS_CHANNEL = "calls";
    // ID FIXE : un seul appel entrant à la fois → facile à annuler.
    public static final int CALL_NOTIF_ID = 424242;

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        if (data == null) return;
        String type = data.get("type");
        if ("call".equals(type)) {
            showIncomingCall(data);
        } else if ("call-cancel".equals(type)) {
            cancelIncomingCall();
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

    private void cancelIncomingCall() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(CALL_NOTIF_ID);
        } catch (Exception ignored) { }
        IncomingCallActivity.cancelCurrent();
    }

    private void showIncomingCall(Map<String, String> data) {
        ensureCallsChannel();

        Intent full = new Intent(this, IncomingCallActivity.class);
        full.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        for (Map.Entry<String, String> e : data.entrySet()) {
            full.putExtra(e.getKey(), e.getValue());
        }

        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent fullPI = PendingIntent.getActivity(this, CALL_NOTIF_ID, full, piFlags);

        String groupName = data.get("groupName");
        String callerName = data.get("callerName");
        String title = (groupName != null && !groupName.isEmpty())
                ? ("Le groupe " + groupName + " vous appelle")
                : (callerName != null ? callerName : "Appel entrant");
        String text = "video".equals(data.get("callType")) ? "Appel vidéo entrant" : "Appel audio entrant";

        // Action « Refuser » (broadcast → ferme notif + écran)
        Intent declineIntent = new Intent(this, CallActionReceiver.class);
        declineIntent.setAction(CallActionReceiver.ACTION_DECLINE);
        PendingIntent declinePI = PendingIntent.getBroadcast(this, CALL_NOTIF_ID + 1, declineIntent, piFlags);

        // Action « Accepter » → ouvre l'app sur la page d'appel (rejoint LiveKit
        // + signale « accepté » à l'appelant via la page ?join=1).
        Intent acceptIntent = new Intent(this, MainActivity.class);
        acceptIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        acceptIntent.putExtra("openUrl", data.get("roomUrl"));
        PendingIntent acceptPI = PendingIntent.getActivity(this, CALL_NOTIF_ID + 2, acceptIntent, piFlags);

        // CallStyle = motif d'appel entrant OFFICIEL Android. Avantages vs de
        // simples boutons addAction (qui, sur MIUI, faisaient afficher une carte
        // à la place du plein écran → régression) :
        //  - conserve le fullScreenIntent (Android 14+ n'autorise le plein écran
        //    QUE pour ce style sans réglage manuel — cf. targetSdk 36) ;
        //  - boutons Répondre/Refuser rendus par le système (respectés par MIUI) ;
        //  - n'empêche PAS le déclenchement de l'écran plein format.
        Person caller = new Person.Builder().setName(title).build();

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CALLS_CHANNEL)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(text)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setOngoing(true)
                .setTimeoutAfter(40_000L)
                .setFullScreenIntent(fullPI, true)
                .setStyle(NotificationCompat.CallStyle.forIncomingCall(caller, declinePI, acceptPI));

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(CALL_NOTIF_ID, b.build());

        // Xiaomi/MIUI ignore souvent le fullScreenIntent en arrière-plan. Si
        // l'écran est verrouillé ou éteint, on tente d'ouvrir DIRECTEMENT l'écran
        // d'appel (autorisé quand « Afficher les fenêtres pop-up en arrière-plan »
        // est accordé — ce que demandent WhatsApp & co). Sur Android standard ce
        // lancement en arrière-plan est bloqué → le fullScreenIntent prend le
        // relais. Pas de double écran : IncomingCallActivity est en singleTop.
        try {
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            boolean locked = km != null && km.isKeyguardLocked();
            boolean screenOff = pm != null && !pm.isInteractive();
            if (locked || screenOff) {
                startActivity(full);
            }
        } catch (Exception ignored) { }
    }
}
