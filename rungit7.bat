@echo off
cd /d C:\Users\RVREND~1\ccb-app
if exist .git\index.lock del /f .git\index.lock
"C:\Program Files\Git\cmd\git.exe" add app/temoignages/TemoignagesClient.tsx
echo ADD exit: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" status --short
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: insert Bootcamp 2025 featured testimonials in /temoignages page"
echo COMMIT exit: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH exit: %ERRORLEVEL%
