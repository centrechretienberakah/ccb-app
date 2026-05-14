@echo off
cd /d C:\Users\RVREND~1\ccb-app
if exist .git\index.lock del /f .git\index.lock
"C:\Program Files\Git\cmd\git.exe" add app/bible/page.tsx app/bible/lire/page.tsx components/layout/Sidebar.tsx app/dashboard/DashboardClient.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: Ma Bible hub - 2 choix (Lire la Bible / Plan de Lecture), /bible/lire pour le lecteur"
echo COMMIT: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH: %ERRORLEVEL%
