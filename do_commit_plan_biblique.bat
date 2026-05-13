@echo off
cd /D "C:\Users\Révérend\ccb-app"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul

git add app\plan-biblique\page.tsx
git add app\plan-biblique\PlanBibliqueClient.tsx
git add lib\bible\plans.ts
git add components\layout\Sidebar.tsx
git add components\layout\TopBar.tsx
git add app\dashboard\DashboardClient.tsx
git add app\admin\page.tsx
git add app\admin\AdminClient.tsx

git rm --cached app\plan-biblique\page.tsx 2>nul
git rm --cached app\plan-biblique\PlanBibliqueClient.tsx 2>nul
git rm --cached lib\bible\plans.ts 2>nul
git rm app\plan-biblique\page.tsx 2>nul
git rm app\plan-biblique\PlanBibliqueClient.tsx 2>nul
git rm lib\bible\plans.ts 2>nul

git add components\layout\Sidebar.tsx
git add components\layout\TopBar.tsx
git add app\dashboard\DashboardClient.tsx
git add app\admin\page.tsx
git add app\admin\AdminClient.tsx

git commit -m "feat: supprimer Plan Biblique — page, lib, nav, dashboard, admin"
git push origin main

echo.
echo ====================================================
echo  Suppression Plan Biblique deploye !
echo ====================================================
pause
