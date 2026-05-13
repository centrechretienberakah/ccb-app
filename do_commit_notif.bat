@echo off
cd /D "%~dp0"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
git add components/layout/TopBar.tsx components/layout/Sidebar.tsx app/globals.css app/notifications/page.tsx app/notifications/NotificationsClient.tsx supabase/notifications.sql
git commit -m "feat: notifications system — badge cloche + page /notifications"
echo Done.
