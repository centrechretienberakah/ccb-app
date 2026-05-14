@echo off
cd /d C:\Users\RVREND~1\ccb-app
if exist .git\index.lock del /f .git\index.lock
"C:\Program Files\Git\cmd\git.exe" add app/bible/page.tsx app/bible/BibleHubClient.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "fix: bible hub - extraire BibleHubClient (use client) pour corriger server component error"
echo COMMIT: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH: %ERRORLEVEL%
