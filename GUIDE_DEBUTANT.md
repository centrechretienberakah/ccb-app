# 🟢 Guide DÉBUTANT — Publier « Famille Berakah » sur le Play Store

Ce guide est écrit **pour une personne non développeuse**, **clic par clic**.
Il couvre **2 grandes parties** :

- **Partie A** — fabriquer le fichier de l'app (`.aab`) avec Android Studio.
- **Partie B** — publier ce fichier sur le Google Play Store.

> Prévois **1 à 2 h** pour la Partie A (surtout des téléchargements/attente) et
> **1 à 2 h** pour la Partie B (la 1re fois). Tu as besoin d'un ordinateur
> Windows/Mac et d'une connexion Internet.

---

# PARTIE A — Fabriquer le fichier de l'app (.aab)

## A1. Installer Node.js (5 min)
1. Va sur **https://nodejs.org**
2. Clique le bouton **« LTS »**.
3. Ouvre le fichier téléchargé → **Suivant → Suivant → Installer → Terminer**.

## A2. Installer Android Studio (15–30 min)
1. Va sur **https://developer.android.com/studio**
2. Clique **« Download Android Studio »**, accepte, télécharge.
3. Installe → **Next → Next → Install → Finish**.
4. Au 1er lancement : **Next → Standard → Next → Finish**. Laisse-le télécharger
   le nécessaire (plusieurs Go, sois patient).

## A3. Préparer le projet (2 commandes, une seule fois)
1. Ouvre le **dossier du projet** dans l'explorateur de fichiers.
2. Dans la barre d'adresse, tape **`cmd`** + **Entrée** (fenêtre noire).
3. Tape puis Entrée (attends la fin) :
   ```
   npm install
   ```
4. Puis :
   ```
   npx cap sync android
   ```
   Quand tu vois **« Sync finished »**, ferme la fenêtre.

## A4. Ouvrir le projet dans Android Studio (10–30 min la 1re fois)
1. Ouvre **Android Studio** → **« Open »**.
2. Sélectionne le dossier **`android`** (à l'intérieur du dossier du projet) → **OK**.
3. En bas, **« Gradle Sync »** travaille → **attends la fin**.
4. Si une fenêtre propose d'installer des composants → clique **« Install »** / **« Accept »**.

## A5. Créer ta clé + générer le fichier .aab
1. Menu **Build** → **Generate Signed App Bundle / APK…**
2. Choisis **« Android App Bundle »** → **Next**.
3. Clique **« Create new… »** (créer ta clé — **une seule fois**) :
   - **Key store path** : choisis un endroit sûr, nomme le fichier `famille-berakah.jks`.
   - **Password** + **Confirm** : un mot de passe → **NOTE-LE**.
   - **Alias** : `famille-berakah`
   - **Password** (clé) + Confirm → **NOTE-LE**.
   - **Validity (years)** : `30`
   - **First and Last Name** : `Centre Chretien Berakah`
   - **OK**.
4. Coche **« Remember passwords »** → **Next**.
5. Choisis **« release »** → **Create** / **Finish**.
6. Notification en bas à droite → clique **« locate »** pour ouvrir le dossier.

## A6. Ton fichier
À publier : **`app-release.aab`**, dans
`android\app\release\` ou `android\app\build\outputs\bundle\release\`.

## 🔴 RÈGLE D'OR
**Sauvegarde** le fichier `famille-berakah.jks` **et les 2 mots de passe** (lieu sûr +
copie cloud). **Si tu les perds, tu ne pourras plus jamais mettre à jour l'app.**

---

# PARTIE B — Publier sur le Google Play Store

## ⚠️ À préparer AVANT (important)
- Un **compte Google** (Gmail) dédié à l'église de préférence.
- Une **carte bancaire** : frais **uniques de 25 $** (à vie).
- Une **pièce d'identité** (Google vérifie l'identité des nouveaux comptes).
- Une **politique de confidentialité** en ligne (URL) — *obligatoire*. (Je peux te la
  créer dans l'app, ex. `centrechretienberakah.com/confidentialite`.)
- Un **identifiant + mot de passe de test** (l'app exige une connexion : les
  vérificateurs de Google doivent pouvoir se connecter).
- **2 à 8 captures d'écran** de l'app (prises depuis ton téléphone).
- L'**icône 512×512** (déjà dispo : `public/icon-512x512.png`) et une **bannière
  1024×500** (je peux t'aider à la créer).

> 💡 **Conseil clé** : crée le compte en tant qu'**Organisation** (et non
> « Particulier »). Les comptes « Particulier » créés récemment doivent d'abord
> faire **tester l'app par 12 personnes pendant 14 jours** avant de pouvoir publier.
> Les comptes **Organisation** en sont **dispensés** — idéal pour une église.

## B1. Créer le compte développeur (une fois)
1. Va sur **https://play.google.com/console**
2. Connecte-toi avec le compte Google de l'église.
3. Clique **« Créer un compte développeur »**.
4. Choisis **« Une organisation / entreprise »**.
5. Renseigne le nom : **Centre Chrétien Berakah**, les coordonnées, etc.
6. Paie les **25 $**.
7. Suis la **vérification d'identité** demandée (envoi de pièce d'identité). Cela peut
   prendre de quelques heures à quelques jours — c'est normal.

## B2. Créer l'application
1. Dans la console, clique **« Créer une application »**.
2. **Nom de l'application** : `Famille Berakah`
3. **Langue par défaut** : Français.
4. **Application ou jeu** : Application.
5. **Gratuite ou payante** : Gratuite.
6. Coche les déclarations → **« Créer l'application »**.

## B3. Remplir le tableau de bord (checklist à gauche)
La console te guide avec une liste. Renseigne dans **« Configurer l'application »** :
1. **Accès à l'application** : indique que la connexion est requise et **fournis un
   identifiant + mot de passe de test** (sinon Google refuse l'app).
2. **Annonces** : « Non, l'app ne contient pas d'annonces ».
3. **Classification du contenu** : réponds au questionnaire (contenu religieux, tout public).
4. **Public cible** : choisis les tranches d'âge (ex. 13+ ou tout public).
5. **Sécurité des données** : déclare ce que l'app utilise — **compte/e-mail**,
   **caméra et micro** (CCB Meet), **notifications**. Indique que les données ne sont
   pas vendues.
6. **Politique de confidentialité** : colle l'**URL** de ta page de confidentialité.

## B4. Fiche Play Store (présentation)
Dans **« Présence sur le Store » → « Fiche principale du Store »** :
1. **Nom** : Famille Berakah
2. **Description courte** (80 caractères max).
3. **Description complète** (l'app, ses fonctions : communauté, Bible, méditations,
   groupes, dons…).
4. **Icône** : téléverse `icon-512x512.png`.
5. **Image de bannière** : 1024×500.
6. **Captures d'écran téléphone** : au moins 2.
7. **Catégorie** : *Mode de vie* (ou *Confession & spiritualité*). E-mail de contact.
8. **Enregistrer**.

## B5. Téléverser le fichier .aab et publier
1. Menu de gauche : **« Publication » → « Production »** (ou commence par **« Tests
   internes »** pour essayer sans risque).
2. Clique **« Créer une release »**.
3. Si on te le propose, **active « Play App Signing »** (Google gère la clé) →
   **Continuer**.
4. **Glisse-dépose** ton fichier **`app-release.aab`** dans la zone d'envoi.
5. **Nom de la release** : `1.0.0`. **Notes de version** : ex. « Première version ».
6. Clique **« Suivant »** → **« Enregistrer »**.
7. Clique **« Examiner la release »** puis **« Démarrer le déploiement en production »**.
8. ✅ Google **examine l'app** (de quelques heures à quelques jours). Tu reçois un
   e-mail quand elle est en ligne.

## B6. Pour les mises à jour suivantes
1. Dans `android/app/build.gradle` : augmente **`versionCode`** (+1) et
   **`versionName`** (ex. `1.0.1`).
2. Refais la **Partie A5** (même clé !) pour générer un nouvel `.aab`.
3. Dans la console : **Production → Créer une release → téléverser le nouvel `.aab` →
   déployer**.

---

## Besoin d'aide ?
- **Politique de confidentialité** et **page d'aide** : je peux les créer dans l'app.
- **Bannière 1024×500** et **textes de la fiche** : je peux te les préparer.
- **App Links** (ouvrir les liens du site dans l'app) : voir `GUIDE_ANDROID.md` §7.
