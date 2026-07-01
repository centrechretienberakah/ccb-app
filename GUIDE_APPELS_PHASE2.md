# 📞 Phase 2 · Étape 2 — Appels entrants façon WhatsApp (blueprint)

> ⚠️ **À lire d'abord.** Cette étape est du **code natif Android (Kotlin)** qui doit
> être **compilé et testé sur un vrai téléphone dans Android Studio**. Il ne peut pas
> être vérifié depuis l'environnement de génération du code. Ce document est le
> **plan d'implémentation complet** : architecture, fichiers natifs, payload FCM,
> changement serveur et plan de test. Fais-toi accompagner d'un développeur Android
> pour l'intégration/les tests, ou dis-moi quand tu es prêt à tester et je te livre
> les fichiers un par un, en itérant sur les erreurs que tu me remontes.

---

## 1. Architecture (comment ça marche)

L'app est une **WebView Capacitor** qui charge le site ; l'appel lui-même (LiveKit)
est **la page web d'appel existante**. Le natif ne fait donc que **réveiller** et
**afficher l'écran d'appel entrant**, puis **ouvrir la page d'appel** dans la WebView.

```
Appelant lance l'appel
   → serveur envoie un message FCM "data" HAUTE PRIORITÉ au(x) token(s) du destinataire
      (type=call, nom, avatar, type audio/vidéo, URL de la salle)
   → sur le téléphone, un service natif reçoit le message MÊME APP FERMÉE
      → notification "full screen intent" (canal Appels, importance URGENT)
      → écran plein format natif : photo + nom + Accepter / Refuser + sonnerie + vibration
   → ACCEPTER → ouvre la WebView sur l'URL d'appel → LiveKit rejoint la salle
   → REFUSER  → ferme + (option) prévient l'appelant
```

Le système d'appel existant (table `calls`, LiveKit, page `/community/.../call`) **ne
change pas**. Seul le **canal de réveil** devient natif (en plus du Realtime/web-push).

---

## 2. Contrat du message FCM (data-only, haute priorité)

Le serveur envoie un message **`data`** (pas `notification`, pour que le natif garde
la main sur l'affichage), avec `android.priority=HIGH` :

```json
{
  "message": {
    "token": "<token FCM du destinataire>",
    "data": {
      "type": "call",
      "callId": "<uuid>",
      "callType": "audio" | "video",
      "callerName": "Jean Dupont",
      "callerAvatar": "https://…/avatar.jpg",
      "roomUrl": "/community/messages/<id>/call?join=1",
      "groupName": ""      // rempli pour un appel de groupe : "Le groupe X vous appelle"
    },
    "android": { "priority": "HIGH", "ttl": "45s" }
  }
}
```

- **Appel de groupe** : même payload avec `groupName` renseigné et `roomUrl` = l'URL
  d'appel du groupe. Chaque membre reçoit « Le groupe X vous appelle » → Accepter →
  rejoint la salle LiveKit du groupe.

---

## 3. Changement SERVEUR (à ajouter)

Créer un helper `lib/native/callInvite.ts` (côté serveur) qui envoie ce message data
aux tokens du destinataire, avec `data` + `priority:high`. On peut réutiliser
`sendFcm()` en ajoutant une variante « data-only ». À câbler dans le flux d'appel
existant (`lib/meet/calls.ts` → `ringCall` / `pushCallNotification`) : au moment où
l'appel sonne, appeler ce helper avec les infos de l'appelant + l'URL de la salle.

Esquisse (à finaliser) :
```ts
// lib/native/fcm.ts — ajouter une option data-only (déjà supporté via msg.data)
// lib/native/callInvite.ts
export async function sendCallInvite(admin, calleeUserIds, invite) {
  // récupère les tokens de calleeUserIds dans native_push_tokens
  // envoie sendFcm(tokens, { data: { type:"call", ...invite }, channelId:"calls", priority:"high" })
  // (SANS title/body → message data-only)
}
```
> Note : pour un message **data-only**, ne pas mettre `notification` dans le payload
> FCM ; laisser le natif afficher l'UI.

---

## 4. Fichiers NATIFS à créer (Kotlin)

Dossier : `android/app/src/main/java/com/centrechretienberakah/app/`

### 4.1 `CallFirebaseMessagingService.kt`
Service qui reçoit les messages FCM (même app tuée). Si `type=="call"` → affiche
l'écran d'appel plein format ; sinon → notification normale.
```kotlin
package com.centrechretienberakah.app

import android.app.*
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class CallFirebaseMessagingService : FirebaseMessagingService() {

  override fun onMessageReceived(msg: RemoteMessage) {
    val data = msg.data
    if (data["type"] == "call") {
      showIncomingCall(data)
    } else {
      // Notifications normales (messages, groupes…) : affichage simple.
      // (Ou déléguer au plugin Capacitor — voir §6 « conflit de service ».)
    }
  }

  override fun onNewToken(token: String) {
    // Voir §6 : stratégie d'enregistrement du token (persister pour que le JS
    // authentifié l'envoie à /api/native/push-token).
    TokenBridge.store(applicationContext, token)
  }

  private fun showIncomingCall(data: Map<String, String>) {
    val intent = Intent(this, IncomingCallActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      putExtra("callType", data["callType"])
      putExtra("callerName", data["callerName"])
      putExtra("callerAvatar", data["callerAvatar"])
      putExtra("roomUrl", data["roomUrl"])
      putExtra("groupName", data["groupName"])
      putExtra("callId", data["callId"])
    }
    val fullScreenPI = PendingIntent.getActivity(
      this, 0, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val title = if (!data["groupName"].isNullOrEmpty())
      "Le groupe ${data["groupName"]} vous appelle" else (data["callerName"] ?: "Appel entrant")

    val notif = NotificationCompat.Builder(this, "calls")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(if (data["callType"] == "video") "Appel vidéo" else "Appel audio")
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setOngoing(true)
      .setFullScreenIntent(fullScreenPI, true)   // ← l'écran plein format, même verrouillé
      .build()

    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
      .notify(data["callId"].hashCode(), notif)
  }
}
```

### 4.2 `IncomingCallActivity.kt`
Écran plein format (au-dessus de l'écran verrouillé) : photo, nom, type, Accepter/Refuser,
sonnerie + vibration. **Accepter** ouvre `MainActivity` sur `roomUrl` (la WebView charge
la page d'appel → LiveKit).
```kotlin
class IncomingCallActivity : Activity() {
  override fun onCreate(b: Bundle?) {
    super.onCreate(b)
    // Afficher au-dessus du verrouillage + réveiller l'écran
    setShowWhenLocked(true); setTurnScreenOn(true)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    setContentView(R.layout.activity_incoming_call)
    // … lier nom/photo/type depuis intent, démarrer Ringtone + Vibrator …
    // Accepter :
    //   val url = intent.getStringExtra("roomUrl")
    //   startActivity(Intent(this, MainActivity::class.java)
    //       .putExtra("openUrl", url).addFlags(FLAG_ACTIVITY_NEW_TASK))
    //   stopRingtone(); finish()
    // Refuser : stopRingtone(); finish()  (+ option : POST refus au serveur)
  }
}
```
+ layout `res/layout/activity_incoming_call.xml` (fond violet #5A2CA0, avatar rond,
nom, 2 gros boutons ronds : vert « Accepter », rouge « Refuser »).

### 4.3 `Ringtone` + vibration
Utiliser `RingtoneManager.getRingtone(TYPE_RINGTONE)` (respecte le volume système et
le mode silencieux) + `Vibrator` en pattern répété. Fournir aussi un son custom dans
`res/raw/ringtone_ccb.mp3` (optionnel). **Respecter Ne pas déranger** : le canal
`calls` en importance URGENT + catégorie CALL est traité correctement par Android.

### 4.4 Ouvrir l'URL dans la WebView à l'acceptation
Dans `MainActivity` (générée par Capacitor), lire l'extra `openUrl` dans `onCreate` /
`onNewIntent` et charger cette URL dans la WebView du bridge Capacitor
(`this.bridge.webView.loadUrl(prodUrl + openUrl)`), pour que LiveKit rejoigne la salle.

### 4.5 Notification d'appel persistante (pendant l'appel)
Un `ForegroundService` (type `phoneCall`/`mediaPlayback`) avec une notification
permanente : « Appel en cours · Retour à l'appel · Raccrocher ». Démarré à
l'acceptation, arrêté à la fin.

---

## 5. Manifest & Gradle

`AndroidManifest.xml` (dans `<application>`) :
```xml
<service
    android:name=".CallFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>

<activity
    android:name=".IncomingCallActivity"
    android:exported="false"
    android:showWhenLocked="true"
    android:turnScreenOn="true"
    android:excludeFromRecents="true"
    android:launchMode="singleTop"
    android:theme="@style/AppTheme.NoActionBarLaunch" />

<service
    android:name=".OngoingCallService"
    android:foregroundServiceType="phoneCall"
    android:exported="false" />
```
Permissions (en plus de celles déjà présentes) :
```xml
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />
```
Gradle : `firebase-messaging` est déjà tiré par `@capacitor/push-notifications`
(sinon `implementation "com.google.firebase:firebase-messaging"`).

---

## 6. ⚠️ Point d'intégration délicat : conflit de service FCM

`@capacitor/push-notifications` déclare **son propre** `FirebaseMessagingService`
(qui gère l'enregistrement du token de l'Étape 1). FCM ne délivre qu'à **un seul**
service. Deux options :

- **Option A (recommandée)** : notre `CallFirebaseMessagingService` devient le service
  unique. Il gère les appels (plein écran) ET les notifs normales. Pour le **token**,
  `onNewToken` le **stocke** (Capacitor `Preferences`) ; le `NativePushRegistrar` (JS,
  authentifié) le lit et l'envoie à `/api/native/push-token`. → l'Étape 1 continue de
  marcher, sans exposer de secret.
- **Option B** : garder le service du plugin pour tokens + notifs normales, et traiter
  les appels via un **plugin Capacitor custom** déclenché sur message data. Plus lourd.

C'est **le** point qui demande un développeur Android + des tests. Je peux écrire
l'Option A en entier quand tu es prêt à la tester.

---

## 7. Plan de TEST (sur appareils réels)

| Scénario | Attendu |
|---|---|
| App **ouverte** | Écran d'appel plein format s'affiche |
| App **en arrière-plan** | Écran d'appel s'affiche par-dessus |
| App **fermée (tuée)** | Écran d'appel s'affiche (via FCM data + full-screen intent) |
| Téléphone **verrouillé** | Écran d'appel au-dessus du verrouillage + sonnerie |
| **Accepter** | Ouvre la WebView sur la salle → LiveKit rejoint (audio/vidéo) |
| **Refuser** | Ferme l'écran ; (option) l'appelant voit « refusé » |
| **Appel de groupe** | « Le groupe X vous appelle » → Accepter → rejoint la salle |
| **Mode silencieux / DND** | Comportement conforme (canal Appels URGENT + CATEGORY_CALL) |
| **Mode avion / connexion faible** | Pas de crash ; l'appel expire proprement (ttl 45s) |
| **Plusieurs appareils** | Tous sonnent ; répondre sur l'un annule les autres (via le serveur) |
| **Optimisation batterie** | Un seul foreground service, uniquement pendant l'appel |

---

## 8. Ordre de réalisation conseillé
1. Serveur : `sendCallInvite` (data-only, high) branché sur le flux d'appel.
2. Natif : `CallFirebaseMessagingService` + `IncomingCallActivity` + layout + sonnerie.
3. `MainActivity` : ouverture de `roomUrl` dans la WebView à l'acceptation.
4. `OngoingCallService` (notification persistante) + annulation multi-appareils.
5. Tests §7 sur 2 téléphones.

> Quand tu es prêt à tester dans Android Studio, dis-le-moi : je te fournis les
> fichiers de l'Option A (§6) prêts à coller, puis on corrige ensemble d'après les
> logs/erreurs de compilation que tu me donnes.
