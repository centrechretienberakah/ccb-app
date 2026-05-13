@echo off
cd /d C:\Users\Révérend\ccb-app

echo === Nettoyage index git si corrompu ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === Ajout des fichiers modifies ===
git add public/logo-officiel.png
git add components/layout/Sidebar.tsx
git add app/auth/login/page.tsx
git add app/auth/register/page.tsx
git add app/dashboard/DashboardClient.tsx
git add app/globals.css

echo === Statut ===
git status

echo === Commit ===
git commit -m "feat: remplacer croix par logo officiel CCB (sidebar, login, register, dashboard)"

echo === Push ===
git push origin main

echo.
echo === Done! Logo officiel deploye partout ===
pause
