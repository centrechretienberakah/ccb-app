@echo off
cd /d C:\Users\Révérend\ccb-app

if exist ".git\index.lock" del /f /q ".git\index.lock"

git add app/page.tsx
git add lib/bible/versions.ts
git add app/api/bible/route.ts
git add app/bible/read/[book]/[chapter]/ReaderClient.tsx
git add app/bible/BibleClient.tsx
git add app/api/bible-list/route.ts

git commit -m "fix: renommer Plans de Lecture -> Bible sur landing page + multi-versions Bible"

git push origin main

echo Done!
pause
