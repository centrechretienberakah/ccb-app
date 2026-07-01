package com.centrechretienberakah.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Actions de la notification d'appel (Phase 2 · Étape 2).
 * « Refuser » → ferme la notification + l'écran d'appel s'il est affiché.
 *
 * Les boutons d'action de la notification sont le moyen FIABLE de décrocher
 * sur les appareils (Xiaomi/MIUI…) qui bloquent l'ouverture d'un écran plein
 * format depuis l'arrière-plan.
 */
public class CallActionReceiver extends BroadcastReceiver {

    public static final String ACTION_DECLINE = "com.centrechretienberakah.app.DECLINE_CALL";

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(CallMessagingService.CALL_NOTIF_ID);
        } catch (Exception ignored) { }
        IncomingCallActivity.cancelCurrent();
    }
}
