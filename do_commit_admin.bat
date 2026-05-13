@echo off
cd /D "C:\Users\Révérend\ccb-app"

del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul

git add app/admin/page.tsx app/admin/AdminClient.tsx

git commit -m "fix: admin dashboard — colonnes reelles DB (is_answered, content, sans email)"
git push origin main

echo.
echo ====================================================
echo  Commit et push termines !
echo ====================================================
pause
