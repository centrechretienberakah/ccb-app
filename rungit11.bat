@echo off
cd /d C:\Users\RVREND~1\ccb-app
if exist .git\index.lock del /f .git\index.lock
"C:\Program Files\Git\cmd\git.exe" add app/dashboard/DashboardClient.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: remove stats row from dashboard"
echo COMMIT: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH: %ERRORLEVEL%
