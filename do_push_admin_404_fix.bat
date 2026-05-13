@echo off
cd /d "C:\Users\Révérend\ccb-app"

if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock

git add app\admin\page.tsx app\admin\AdminShell.tsx middleware.ts
git commit -m "fix(admin): page.tsx full client component - no server deps"
git push origin main

echo.
echo Attends que Vercel finisse (2 min), puis essaie /admin
pause
