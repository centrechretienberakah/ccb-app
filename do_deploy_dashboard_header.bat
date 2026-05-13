@echo off
cd /d C:\Users\Révérend\ccb-app

if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === Commit dashboard header ===
git commit -m "feat: dashboard hero converti en tab-bar header uniforme"

echo === Push ===
git push origin main

echo.
echo === Done! ===
pause
