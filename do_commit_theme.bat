@echo off
cd /d "C:\Users\RVREND~1\ccb-app"
del /f "C:\Users\RVREND~1\ccb-app\.git\index.lock" 2>nul
"C:\Program Files\Git\cmd\git.exe" add app/globals.css
"C:\Program Files\Git\cmd\git.exe" add app/layout.tsx
"C:\Program Files\Git\cmd\git.exe" add components/ThemeToggle.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "Feat: theme beige + mode sombre - CSS vars, ThemeToggle, anti-flash script"
"C:\Program Files\Git\cmd\git.exe" push origin main
echo EXIT_CODE=%ERRORLEVEL%
