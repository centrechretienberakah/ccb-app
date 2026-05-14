@echo off
cd /d C:\Users\RVREND~1\ccb-app
if exist .git\index.lock del /f .git\index.lock
"C:\Program Files\Git\cmd\git.exe" add app/page.tsx
echo ADD exit: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" commit -m "redesign: landing page - minimal single screen, logo + slogan + titre + vision + CTA, couleur #5A2CA0"
echo COMMIT exit: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH exit: %ERRORLEVEL%
