@echo off
cd /d C:\Users\RVREND~1\ccb-app
if exist .git\index.lock del /f .git\index.lock
"C:\Program Files\Git\cmd\git.exe" add components/layout/Sidebar.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: sidebar - toutes rubriques fusionnées ordre alphabétique (21 items)"
echo COMMIT: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH: %ERRORLEVEL%
