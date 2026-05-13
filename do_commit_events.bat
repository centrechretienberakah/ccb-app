@echo off
cd /D "%~dp0"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
git add app/events/page.tsx app/events/EventsClient.tsx supabase/events.sql components/layout/TopBar.tsx
git commit -m "feat: page /events — calendrier, RSVP, modal admin creation"
git push origin main
echo Done.
