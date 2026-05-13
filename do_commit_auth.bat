@echo off
cd /d "C:\Users\RVREND~1\ccb-app"
del /f "C:\Users\RVREND~1\ccb-app\.git\index.lock" 2>nul
"C:\Program Files\Git\cmd\git.exe" add app/auth/login/page.tsx
"C:\Program Files\Git\cmd\git.exe" add app/auth/register/page.tsx
"C:\Program Files\Git\cmd\git.exe" add app/globals.css
"C:\Program Files\Git\cmd\git.exe" commit -m "Auth redesign: login + register 2 colonnes design system CCB (beige/violet/or)"
"C:\Program Files\Git\cmd\git.exe" push origin main
echo EXIT_CODE=%ERRORLEVEL%
