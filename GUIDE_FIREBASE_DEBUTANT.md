# 🔵 Guide DÉBUTANT — Activer les notifications (Firebase / FCM)

Pas à pas, pour une personne non développeuse. Tu as besoin du **compte Google de
l'église** (le même que pour le Play Store, c'est plus simple).

- **Point 1** = exécuter le fichier SQL (fait dans Supabase, comme d'habitude) :
  `supabase/native_push_tokens_v87.sql`.
- Ce guide détaille les **points 2, 3 et 4**.

---

## 🔵 POINT 2 — Créer Firebase + récupérer `google-services.json`

### 2.A Créer le projet
1. Va sur **https://console.firebase.google.com**
2. Connecte-toi avec le compte Google de l'église.
3. Clique **« Créer un projet »**.
4. **Nom** : `Famille Berakah` → **Continuer**.
5. **Google Analytics** : tu peux **désactiver** l'interrupteur → **Continuer / Créer**.
6. Attends ~30 s → **Continuer**.

### 2.B Ajouter l'application Android
1. Clique l'**icône Android** (robot vert) — ou **⚙️ → Paramètres du projet → Vos
   applications → Ajouter une appli → Android**.
2. **Nom du package Android** (⚠️ exactement) :
   ```
   com.centrechretienberakah.app
   ```
3. **Pseudo** (facultatif) : `Famille Berakah`.
4. **SHA-1** : laisse vide.
5. **« Enregistrer l'application »**.

### 2.C Télécharger le fichier
1. Clique **« Télécharger google-services.json »**.
2. Le fichier arrive dans **Téléchargements**.
3. Les étapes « Ajouter le SDK » affichées ensuite : **ignore-les** →
   **Suivant → Suivant → Accéder à la console**.

### 2.D Placer le fichier
1. Explorateur de fichiers → dossier du projet → **`android`** → **`app`**.
2. **Colle** `google-services.json` dans `android\app\` (à côté de `build.gradle`).

✅ Point 2 terminé.

---

## 🟢 POINT 3 — La clé pour ENVOYER les notifications

### 3.A Générer la clé
1. Console Firebase → **⚙️ → Paramètres du projet**.
2. Onglet **« Comptes de service »**.
3. **« Générer une nouvelle clé privée »** → **« Générer la clé »**.
4. Un fichier **`.json`** est téléchargé. **Garde-le secret.**

### 3.B Copier son contenu
1. Ouvre ce `.json` avec le **Bloc-notes** (clic droit → Ouvrir avec → Bloc-notes).
2. **Ctrl+A** puis **Ctrl+C** (tout copier).

### 3.C Le coller dans Vercel
1. **https://vercel.com** → ton projet → **« Settings »**.
2. Menu gauche → **« Environment Variables »**.
3. **Key (Nom)** :
   ```
   FIREBASE_SERVICE_ACCOUNT
   ```
4. **Value (Valeur)** : **Ctrl+V** (colle tout le JSON).
5. Laisse les 3 environnements cochés → **« Save »**.

### 3.D Redéployer
1. Onglet **« Deployments »** → sur le plus récent, menu **« ⋯ » → « Redeploy »** →
   confirme.
2. Attends le vert (1-2 min).

✅ Point 3 terminé.

---

## 🟣 POINT 4 — Recompiler l'app avec Firebase

1. Ouvre le dossier du projet → dans la barre d'adresse, tape **`cmd`** + Entrée.
2. Copie-colle + Entrée :
   ```
   npx cap sync android
   ```
   Attends **« Sync finished »**.
3. Refais l'**AAB** (ou l'APK) comme dans **`GUIDE_DEBUTANT.md` Partie A5**
   (Android Studio → Build → Generate Signed App Bundle…, **même clé** qu'avant).
4. Installe la nouvelle app / téléverse le nouvel AAB.

✅ Point 4 terminé.

---

## ✅ Vérifier que ça marche
1. Ouvre la nouvelle app, **connecte-toi**, **autorise les notifications**.
2. Depuis un autre compte (ou le web), envoie-toi un message de groupe / une mention.
3. Le téléphone doit recevoir une **notification native**, même app fermée. 🔔
