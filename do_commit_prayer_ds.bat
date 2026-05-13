@echo off
chcp 65001 >nul
cd /D "%~dp0"
del /F ".git\HEAD.lock" 2>nul
del /F ".git\index.lock" 2>nul
git add "app/prayer/PrayerClient.tsx"
git commit -m "Priere: aligner PrayerClient sur le design system (CSS variables, hero gradient, light/dark mode)"
echo.
echo Done. Press any key...
pause >nul
