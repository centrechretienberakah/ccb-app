@echo off
cd /d "C:\Users\Révérend\ccb-app"

echo Nettoyage des verrous git...
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock

echo Commit AdminClient.tsx (balises manquantes)...
git add app\admin\AdminClient.tsx
git commit -m "fix(admin): restore missing closing tags in AdminClient.tsx"

echo Commit Sidebar.tsx (lien admin)...
git add components\layout\Sidebar.tsx
git commit -m "feat(sidebar): add admin link visible for admin/leader roles"

echo Push vers GitHub...
git push origin main

echo.
echo ✅ Tout est pousse ! Verifie le build sur Vercel.
pause
