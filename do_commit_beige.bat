@echo off
cd /D "C:\Users\Révérend\ccb-app"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
git push origin main
echo.
echo Push termine !
pause
