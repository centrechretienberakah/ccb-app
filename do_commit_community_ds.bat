@echo off
cd /D "%~dp0"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
git add "app/profile/ProfileClient.tsx" "app/community/FeedClient.tsx"
git commit -m "design-system: align ProfileClient + FeedClient with CSS variables"
echo Done.
