@echo off
cd /d C:\Users\RVREND~1\ccb-app
if exist .git\index.lock del /f .git\index.lock
"C:\Program Files\Git\cmd\git.exe" add app/dashboard/DashboardClient.tsx app/contact/page.tsx app/live/LiveClient.tsx app/events/EventsClient.tsx
echo ADD exit: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" status --short
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: sync event schedule across all pages - correct times (17h30, 23h30, Bootcamp 26-28 Jun)"
echo COMMIT exit: %ERRORLEVEL%
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH exit: %ERRORLEVEL%
