@echo off
cd /D "%~dp0"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
git add app/events/page.tsx app/events/EventsClient.tsx supabase/events.sql
git commit -m "fix: events — use event_date/end_date to match existing schema"
git push origin main
echo Done.
