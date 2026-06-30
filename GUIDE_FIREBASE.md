# 🔥 Guide Firebase / FCM — Notifications natives (Phase 2 · Étape 1)

Cette étape branche les **notifications natives Android (Firebase Cloud Messaging)**
en plus du web-push existant, sans rien casser. Tes notifications actuelles
(messages, groupes, prières, méditation…) atteindront **aussi** l'app Android,
même fermée/verrouillée.

> Sans configuration Firebase, tout reste inerte : le web/PWA continue comme avant.

---

## 1. Côté base de données
Exécute dans Supabase → SQL Editor :
```
supabase/native_push_tokens_v87.sql
```
(crée la table `native_push_tokens` qui stocke les jetons FCM des appareils.)

## 2. Créer le projet Firebase
1. Va sur **https://console.firebase.google.com** → **Ajouter un projet** →
   nomme-le « Famille Berakah » (ou CCB) → crée-le (Google Analytics facultatif).
2. Dans le projet : **Ajouter une application → Android**.
   - **Nom du package** : `com.centrechretienberakah.app` (⚠️ exactement celui-ci).
   - Enregistre l'app.
3. **Télécharge `google-services.json`** et place-le dans :
   ```
   android/app/google-services.json
   ```
   (Ce fichier est **ignoré par git** — voir `.gitignore`. Le branchement Gradle
   est déjà prêt : il s'active dès que le fichier est présent.)

## 3. Clé du compte de service (pour ENVOYER les notifs)
1. Console Firebase → ⚙️ **Paramètres du projet → Comptes de service**.
2. Clique **« Générer une nouvelle clé privée »** → un fichier **JSON** est téléchargé.
3. Dans **Vercel → Settings → Environment Variables**, ajoute :
   - **`FIREBASE_SERVICE_ACCOUNT`** = **tout le contenu** de ce fichier JSON
     (copie-colle le JSON entier en une seule valeur).
4. Redéploie le site.

> ⚠️ Garde ce JSON **secret** (ne le committe jamais). Il permet d'envoyer des
> notifications en ton nom.

## 4. Recompiler l'app Android
Après avoir ajouté `google-services.json` :
```
npx cap sync android
```
puis régénère l'APK/AAB (cf. GUIDE_DEBUTANT.md). Installe l'app sur un téléphone.

---

## 5. Comment ça marche (vue d'ensemble)
- À l'ouverture de l'app native, **après connexion**, l'appareil s'enregistre
  automatiquement : son **token FCM** est envoyé à `/api/native/push-token` et
  stocké dans `native_push_tokens` (multi-appareils ; les tokens expirés sont
  nettoyés automatiquement à l'envoi).
- Les **canaux** Android (Messages, Groupes, Appels, CCB Live, Événements,
  Institut, Bible Quiz, Plans, Méditons, Général) sont créés au lancement.
- Quand le serveur envoie une notif (route `/api/notifications/send`, déjà
  utilisée partout), elle part **en web-push ET en FCM natif** vers les appareils
  concernés, sur le bon canal selon le type.
- Taper la notification **ouvre la bonne page** (deep link via `data.url`).

## 6. Tester
1. Connecte-toi dans l'app Android (téléphone A).
2. Depuis un autre compte (téléphone B ou le web), déclenche une action qui
   notifie (ex. message de groupe, mention, etc.).
3. Le téléphone A doit recevoir une **notification native**, même app fermée.
4. Diagnostic : la réponse de `/api/notifications/send` contient désormais un
   champ `native: { sent, failed }`.

### Si rien n'arrive
- `FIREBASE_SERVICE_ACCOUNT` bien défini dans Vercel + redéployé ?
- `google-services.json` bien dans `android/app/` + `npx cap sync android` refait ?
- L'utilisateur a-t-il **autorisé les notifications** au 1er lancement (Android 13+) ?
- Le token est-il présent dans `native_push_tokens` pour ce user ?

---

## 7. Ce qui suit (prochaines étapes Phase 2)
Cette étape couvre **notifications natives fiables** (items 1-3 du cahier des
charges). Les **appels entrants façon WhatsApp** (écran plein format, sonnerie,
service de premier plan — items 4-9) nécessitent du **code natif Android (Kotlin)**
à compiler et **tester sur un appareil réel** : c'est l'étape suivante, à faire
dans Android Studio. La fondation FCM posée ici est exactement ce dont elle a
besoin (canal « Appels » en importance URGENT + messages data FCM haute priorité).
