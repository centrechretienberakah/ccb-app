# 📋 Rapport — Migration Android (Capacitor) · Phase 1

**Objectif.** Transformer l'app CCB (Next.js/PWA en production) en une **vraie app
Android** publiable sur le Play Store sous le nom **« Famille Berakah »**, **sans
réécriture**, **sans casser** le web/PWA, et dans un **unique dépôt**.

**Résultat.** ✅ Le même code source fonctionne désormais comme **Web**, **PWA** et
**app Android**. Aucune fonctionnalité retirée, aucune régression web (tsc + `next build`
verts).

---

## 1. Choix technique central : WebView `server.url` (et pourquoi)

L'app dépend fortement du **serveur Next.js** : SSR, routes `/api/*`, `cookies()` dans
le layout (thème), Supabase serveur, LiveKit, `force-dynamic`. Un **export statique
(`output: 'export'`) est donc impossible** sans casser l'app.

→ On utilise la stratégie Capacitor **`server.url`** : la coquille Android embarque une
WebView qui charge directement le **site de production**. Avantages :

- **Zéro réécriture** : tout le code Next.js/React/Supabase/LiveKit est réutilisé tel quel.
- **Web + PWA intacts** : aucune ligne de l'app n'a été modifiée (seulement des ajouts).
- **Mises à jour instantanées** : un déploiement web met à jour l'app (pas besoin de
  re-publier sur le Play Store pour le contenu/logique).
- **Évolutif** : on peut greffer des plugins natifs (push FCM, appels, offline…) en
  Phase 2 sans toucher à l'architecture.

Compromis assumé : l'app a besoin du réseau au lancement (un **écran de secours**
hors-ligne branché est fourni). La PWA (service worker) continue d'assurer du cache.

---

## 2. Ce qui a été fait (Phase 1)

1. **Capacitor 8** installé (core, cli, android) + plugins : `splash-screen`,
   `status-bar`, `app`, `network`, `push-notifications` (FCM, préparé).
2. **`capacitor.config.ts`** : appId `com.centrechretienberakah.app`, nom
   **« Famille Berakah »**, `server.url` = prod, splash/status bar aux couleurs CCB.
3. **Projet Android** généré (`android/`) : Gradle prêt, à ouvrir dans Android Studio.
4. **Splash screen natif** : fond **violet royal #5A2CA0**, logo centré, spinner **or
   #D4AF37**, variantes clair/sombre, toutes densités.
5. **Icônes** : adaptatives + rondes + foreground/background, fond violet, toutes
   densités (générées via `@capacitor/assets`).
6. **AndroidManifest** : permissions (Internet, réseau, **caméra/micro** pour CCB Meet,
   notifications, vibration), **deep links** App Links pour `centrechretienberakah.com`,
   `usesCleartextTraffic=false`.
7. **Noms** : app **« Famille Berakah »** (Play Store), organisation **CCB** (interne).
8. **Signature** : `signingConfigs.release` lit `android/keystore.properties` (ignoré
   par git) → signature automatique des builds release.
9. **Versionnement** : `versionCode 1`, `versionName "1.0.0"`.
10. **Firebase/FCM préparé** : plugin installé, permission déclarée, classpath
    `google-services` présent, application conditionnelle (drop `google-services.json`
    → actif). Hooks code dans `lib/native/`.
11. **Documentation** : `GUIDE_ANDROID.md` (install, build, APK, AAB, signature,
    Play Store, deep links, Firebase, dépannage) + ce rapport.

---

## 3. Fichiers

### Nouveaux
- `capacitor.config.ts` — configuration Capacitor.
- `capacitor-www/index.html` (+ `icon-512x512.png`) — écran de secours/chargement embarqué.
- `capacitor-assets/logo.png` — source des icônes/splash (à remplacer par un 1024px).
- `lib/native/platform.ts` — détection web vs app native (Phase 2).
- `lib/native/push.ts` — enregistrement push FCM **préparé, inerte** (Phase 2).
- `android/` — projet Android natif complet (versionné).
- `android/keystore.properties.example` — modèle de config de signature.
- `GUIDE_ANDROID.md`, `ANDROID_RAPPORT.md` — documentation.

### Modifiés
- `package.json` — dépendances Capacitor + scripts `cap:*`.
- `.gitignore` — exclut clés de signature et `google-services.json`.
- `android/app/src/main/AndroidManifest.xml` — permissions + deep links.
- `android/app/build.gradle` — `versionName 1.0.0` + signature release.

### Non touchés (garantie de non-régression)
- `next.config.ts`, tout `app/`, `lib/` (hors `lib/native/`), Supabase, LiveKit,
  service worker, manifest PWA. **Aucune logique métier modifiée.**

---

## 4. Impacts

- **Web / PWA** : **aucun** (ajouts uniquement). Vérifié : `tsc --noEmit` ✅, `next build` ✅.
- **Build** : les fichiers `lib/native/*` ne sont importés nulle part en Phase 1 →
  exclus du bundle web (zéro poids ajouté côté utilisateur web).
- **Sécurité** : clés de signature et `google-services.json` hors du dépôt.
- **Play Store** : nécessite un compte développeur (25 $) et l'hébergement éventuel de
  `assetlinks.json` pour les App Links.

---

## 5. Compatibilité des modules (à vérifier sur appareil)

Tous les modules tournent dans la WebView via le site de prod, donc **identiques au
web** : Auth, Communauté, Groupes, Chat privé/groupe, **CCB Meet (LiveKit)**, CCB Live,
Bible, Plans, Bible Quiz, Institut, Méditons Ensemble, Dons, Profil, Notifications
existantes (web-push), Tableau de bord.

Points d'attention à tester sur un vrai téléphone :
- **CCB Meet** : autoriser Caméra + Micro au 1er appel (permissions déclarées).
- **Notifications** : le **web-push (VAPID) existant** reste la voie en Phase 1.
  Les push **natifs FCM** arrivent en Phase 2 (voir ci-dessous).
- **Liens externes** : s'ouvrent dans le navigateur ; les liens internes restent dans l'app.

---

## 6. Préparation Phase 2 (déjà en place, rien à refactorer)

Tout ce qui suit pourra être ajouté **sans modifier** l'architecture de la Phase 1 :

### a) Notifications natives (FCM)
- ✅ Plugin `@capacitor/push-notifications` installé ; permission `POST_NOTIFICATIONS`
  déclarée ; classpath + application conditionnelle `google-services` en place.
- ✅ Hook prêt : `lib/native/push.ts` → `registerNativePush(saveToken)` (inerte).
- **À faire en Phase 2** : déposer `google-services.json` dans `android/app/`, créer un
  endpoint backend (ex. `POST /api/native/push-token`) pour stocker le token FCM à côté
  des subscriptions web-push, appeler `registerNativePush()` après login **uniquement en
  natif** (`isNativeApp()`), et router l'envoi serveur vers FCM pour ces tokens.

### b) Appels entrants « façon WhatsApp » + appels de groupe
- ✅ Détection native (`lib/native/platform.ts`) + canal push prêt (FCM Phase 2).
- **À faire en Phase 2** : push **haute priorité** (data message FCM) → afficher une
  *full-screen incoming call* native (plugin type `capacitor-callkeep`/notification
  full-screen) qui ouvre l'écran d'appel **CCB Meet existant** (`/community/.../call`).
  Le système d'appel (table `calls`, LiveKit) reste inchangé : seul le **canal de
  réveil** devient natif. (Cf. mémoire CCB Meet : 2 canaux Realtime + push.)

### c) Notifications haute priorité
- **À faire** : envoyer des messages FCM `priority: high` + canal Android dédié (son,
  vibration, importance MAX) pour les appels et annonces urgentes.

### d) Téléchargements hors ligne / fonctionnalités natives
- ✅ Plugin `@capacitor/app` (cycle de vie) et `@capacitor/network` (état réseau) déjà
  installés.
- **À faire** : `@capacitor/filesystem` / `@capacitor/preferences` pour le cache hors
  ligne (Bible, méditations), partage natif, etc. — additif, sans impact sur l'existant.

### Garantie
La Phase 1 n'introduit **aucune dette** : la coquille native, la config FCM/Gradle, les
hooks `lib/native/*` et les permissions sont posés de façon **évolutive**. La Phase 2
consiste à **brancher**, pas à **refondre**.
