@echo off
cd /d C:\Users\RVREND~1\ccb-app
if exist .git\index.lock del /f .git\index.lock
"C:\Program Files\Git\cmd\git.exe" add app/page.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "redesign: hero premium - ivory bg, Cinzel+Montserrat, float anim, fade-in, purple #5A2CA0, mobile-first"
echo COMMIT: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH: %ERRORLEVEL%
