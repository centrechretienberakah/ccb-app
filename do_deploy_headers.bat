@echo off
cd /d C:\Users\Révérend\ccb-app

echo === Nettoyage index git si corrompu ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === Ajout des fichiers ===
git add app/prayer/PrayerClient.tsx
git add app/community/CommunityClient.tsx
git add app/events/EventsClient.tsx
git add app/notifications/NotificationsClient.tsx
git add app/settings/SettingsClient.tsx
git add app/profile/ProfileClient.tsx
git add app/globals.css
git add components/ComingSoon.tsx

echo === Statut ===
git status

echo === Commit ===
git commit -m "feat: uniformiser les headers de toutes les sections (style tab-bar Bible/Plan)"

echo === Push ===
git push origin main

echo.
echo === Done! Headers uniformises sur toutes les sections ===
pause
