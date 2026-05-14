@echo off
cd /d C:\Users\RVREND~1\ccb-app
if exist .git\index.lock del /f .git\index.lock
"C:\Program Files\Git\cmd\git.exe" rm -r --cached app/annonces/
del /f /q app\annonces\AnnoncesClient.tsx
del /f /q app\annonces\page.tsx
rmdir app\annonces
"C:\Program Files\Git\cmd\git.exe" add -A
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: suppression complete rubrique Annonces (pages, sidebar, bottomnav, topbar, dashboard)"
echo COMMIT: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH: %ERRORLEVEL%
