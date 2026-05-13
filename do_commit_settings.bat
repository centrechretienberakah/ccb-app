@echo off
cd /D "%~dp0"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
git add app/settings/page.tsx app/settings/SettingsClient.tsx
git commit -m "feat: page /settings — compte, securite, apparence, notifications, deconnexion"
git push origin main
echo Done.
