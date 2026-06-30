# 📱 Famille Berakah — Guide Android (Capacitor)

Ce document explique comment **installer, compiler, signer et publier** l'application
Android **Famille Berakah** (Centre Chrétien Berakah), construite avec **Capacitor**
par-dessus l'app Next.js/PWA existante — **sans réécriture** et **dans le même dépôt**.

> **Principe.** L'app Next.js est rendue côté serveur (SSR, routes `/api`, cookies,
> Supabase, LiveKit). On ne fait donc PAS d'export statique. La coquille Android
> charge directement le **site de production** via une WebView (`server.url` dans
> `capacitor.config.ts`). Résultat : **100 % du code est réutilisé**, le web et la PWA
> restent intacts, et on garde un **unique dépôt**.

---

## 1. Pré-requis (poste de build)

| Outil | Version conseillée |
|---|---|
| Node.js | ≥ 20.9 |
| Android Studio | dernière stable (Koala+) |
| JDK | 17 (fourni avec Android Studio) |
| Android SDK | API 34/35 (via Android Studio → SDK Manager) |

- Installer Android Studio, ouvrir le **SDK Manager** et installer : *Android SDK Platform*,
  *Android SDK Build-Tools*, *Android SDK Platform-Tools*, *Android Emulator*.
- Variable d'environnement `ANDROID_HOME` (ou `ANDROID_SDK_ROOT`) pointant sur le SDK.
- Accepter les licences : `sdkmanager --licenses`.

---

## 2. Installation du projet

```bash
npm install            # installe aussi Capacitor + plugins
npx cap sync android   # copie la config + plugins dans le projet Android
npx cap open android   # ouvre le projet dans Android Studio
```

Le dossier **`android/`** est versionné (single repo). Les artefacts de build
(`android/build`, `.gradle`, `local.properties`, clés…) sont ignorés par git.

### Choisir le domaine chargé par l'app
Le domaine est défini dans **`capacitor.config.ts`** → `PROD_URL`
(actuellement `https://centrechretienberakah.com`). Après modification :
```bash
npx cap sync android
```

---

## 3. Tester en local (sur un appareil/émulateur)

### Option A — contre la PROD (le plus simple)
Rien à changer : l'app charge `PROD_URL`. Lancer depuis Android Studio (▶) ou :
```bash
npx cap run android
```

### Option B — contre ton serveur de dev (`npm run dev`)
1. Trouver l'IP LAN du PC (ex. `192.168.1.20`).
2. Dans `capacitor.config.ts`, mettre temporairement :
   ```ts
   server: { url: "http://192.168.1.20:3000", cleartext: true, androidScheme: "http" }
   ```
3. `npm run dev` (sur le PC) puis `npx cap sync android` et lancer sur un appareil
   **du même Wi-Fi**.
4. ⚠️ **Rétablir `PROD_URL` + `cleartext:false` avant tout build release.**

---

## 4. Compilation

> Toutes les commandes Gradle se lancent **depuis `android/`** (`cd android`).
> Sous Windows : utiliser `gradlew.bat` ; sous macOS/Linux : `./gradlew`.

### APK Debug (test rapide, non publiable)
```bash
cd android
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

### APK Release (test « comme en prod », nécessite la signature § 5)
```bash
cd android
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

### AAB Release (format **obligatoire** pour le Play Store)
```bash
cd android
./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

### Numéro de version (à incrémenter à CHAQUE publication)
Dans **`android/app/build.gradle`** :
```gradle
versionCode 1        // entier, +1 à chaque envoi au Play Store
versionName "1.0.0"  // version « marketing » affichée aux utilisateurs
```

---

## 5. Signature (clé de release)

> ⚠️ La clé de signature est **permanente** : sauvegarde-la précieusement
> (et ses mots de passe). La perdre empêche toute mise à jour de l'app.

### 5.1 Générer la clé (une seule fois)
```bash
keytool -genkey -v -keystore famille-berakah.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias famille-berakah
```
Placer `famille-berakah.jks` dans le dossier **`android/`**.

### 5.2 Configurer les mots de passe
Copier l'exemple puis renseigner les valeurs réelles :
```bash
cp android/keystore.properties.example android/keystore.properties
```
```properties
storeFile=famille-berakah.jks
storePassword=********
keyAlias=famille-berakah
keyPassword=********
```
`android/keystore.properties` et `*.jks` sont **ignorés par git** (jamais committés).
Dès que ce fichier existe, `build.gradle` signe automatiquement les builds **release**.

### 5.3 Empreinte SHA-256 (pour les App Links, § 7)
```bash
keytool -list -v -keystore famille-berakah.jks -alias famille-berakah
```

---

## 6. Publication sur Google Play Console

1. Créer un compte développeur Play Console (frais uniques **25 $**).
2. **Créer l'application** → nom public : **Famille Berakah**, langue par défaut FR.
3. **Play App Signing** : laisser Google gérer la clé d'app (recommandé). Tu fournis
   ta clé d'**upload** (celle du § 5) ; Google re-signe avec la clé d'app.
4. **Fiche Play Store** : icône 512×512 (`public/icon-512x512.png`), bannière
   1024×500, captures d'écran (téléphone), description, catégorie *Mode de vie/Religion*.
5. **Contenu** : politique de confidentialité (URL), classification du contenu,
   **Data safety** → déclarer caméra/micro (CCB Meet), notifications, données de compte.
6. **Release** → *Production* (ou *Test interne* d'abord) → **uploader l'AAB**
   (`app-release.aab`) → renseigner les notes de version → envoyer en revue.
7. Les mises à jour suivantes : incrémenter `versionCode`, rebuild AAB, ré-uploader.

> Nom interne de l'organisation : **Centre Chrétien Berakah (CCB)**.
> Nom public Play Store : **Famille Berakah**.

---

## 7. Deep Links / App Links (ouvrir les liens dans l'app)

Le manifeste déclare déjà l'`intent-filter` (avec `autoVerify`) pour
`centrechretienberakah.com`. Pour que l'ouverture soit **automatique** (sans menu) :

Héberger sur le domaine le fichier
**`https://centrechretienberakah.com/.well-known/assetlinks.json`** :
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.centrechretienberakah.app",
    "sha256_cert_fingerprints": ["VOTRE_SHA256_ICI"]
  }
}]
```
- `sha256_cert_fingerprints` = empreinte SHA-256 de la **clé d'app** (avec Play App
  Signing, prends-la dans Play Console → *Configuration → Intégrité de l'app*).
- Sans ce fichier, les liens s'ouvrent quand même (via un sélecteur), sans
  vérification automatique.

> Astuce Next.js : place `assetlinks.json` dans `public/.well-known/` du projet web
> pour qu'il soit servi à cette URL.

---

## 8. Firebase / FCM (préparé — activation en Phase 2)

Tout est **déjà prêt côté Android** : plugin `@capacitor/push-notifications` installé,
permission `POST_NOTIFICATIONS` déclarée, classpath `com.google.gms:google-services`
présent, application conditionnelle du plugin dans `android/app/build.gradle`.

Pour activer (Phase 2) :
1. Créer un projet **Firebase**, ajouter une app Android avec le package
   `com.centrechretienberakah.app`.
2. Télécharger **`google-services.json`** et le placer dans **`android/app/`**
   (ignoré par git).
3. Rebuild → le plugin FCM s'applique automatiquement.
4. Câbler `registerNativePush()` (cf. `lib/native/push.ts`) après le login, puis un
   endpoint backend pour stocker le token FCM. Voir **Préparation Phase 2** ci-dessous.

---

## 9. Commandes utiles (rappel)

```bash
npm run cap:sync     # cap sync android (config + plugins + web assets de secours)
npm run cap:copy     # cap copy android (assets web de secours seulement)
npm run cap:open     # ouvre Android Studio
npm run cap:assets   # régénère icônes + splash depuis capacitor-assets/logo.png
```

Pour des icônes **nettes**, remplace `capacitor-assets/logo.png` par un PNG **1024×1024**
puis `npm run cap:assets && npx cap sync android`.

---

## 10. Dépannage

- **Écran blanc / « page indisponible »** → l'appareil n'a pas de réseau, ou `PROD_URL`
  est faux/non-HTTPS. Vérifier la connexion et `capacitor.config.ts`.
- **Build release non signé** → `android/keystore.properties` absent ou mal renseigné (§ 5).
- **Caméra/micro KO dans CCB Meet** → vérifier que l'utilisateur a accepté les
  permissions Android (Caméra/Micro) au premier appel.
- **Gradle/SDK introuvable** → ouvrir le projet une fois dans Android Studio pour qu'il
  télécharge le SDK/Gradle, ou définir `ANDROID_HOME`.
