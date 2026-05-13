@echo off
cd /d C:\Users\Révérend\ccb-app

echo === Suppression index git corrompu ===
del /f /q ".git\index"
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === Reconstruction de l'index depuis HEAD ===
git reset

echo === Verification du statut ===
git status

echo === Ajout du nouveau fichier bible-list ===
git add app/api/bible-list/route.ts

echo === Statut apres add ===
git status

echo === Commit ===
git commit -m "feat: route diagnostic /api/bible-list pour verifier IDs api.bible"

echo === Push ===
git push origin main

echo.
echo === Done! Visitez votre-domaine/api/bible-list apres deploiement ===
pause
