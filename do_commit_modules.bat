@echo off
cd /d "C:\Users\R%C3%A9v%C3%A9rend\ccb-app" 2>nul || cd /d "%~dp0"
del /f ".git\index.lock" 2>nul
git add -A
git commit -m "feat-activate-all-10-modules"
git push origin main
echo Done!
pause
