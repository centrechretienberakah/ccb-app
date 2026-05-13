@echo off
cd /d "C:\Users\RVREND~1\ccb-app"
del /f "C:\Users\RVREND~1\ccb-app\.git\index.lock" 2>nul
"C:\Program Files\Git\cmd\git.exe" add app/dashboard/page.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "Redesign dashboard: cartes visuelles 2 colonnes + bottom navigation bar"
"C:\Program Files\Git\cmd\git.exe" push origin main
echo EXIT_CODE=%ERRORLEVEL%
