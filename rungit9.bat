@echo off
cd /d C:\Users\RVREND~1\ccb-app
if exist .git\index.lock del /f .git\index.lock
"C:\Program Files\Git\cmd\git.exe" add app/page.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "fix: landing - titre 2 lignes mobile (nowrap), vision en 1 seule ligne"
echo COMMIT exit: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH exit: %ERRORLEVEL%
