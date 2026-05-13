@echo off
cd /D "C:\Users\Révérend\ccb-app"

echo Nettoyage des locks git...
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul

echo Suppression physique des fichiers Plan Biblique...
del /f /q "app\plan-biblique\PlanBibliqueClient.tsx" 2>nul
del /f /q "app\plan-biblique\page.tsx" 2>nul
rmdir /s /q "app\plan-biblique" 2>nul
del /f /q "lib\bible\plans.ts" 2>nul

echo Staging de toutes les modifications...
git rm --cached "app/plan-biblique/PlanBibliqueClient.tsx" 2>nul
git rm --cached "app/plan-biblique/page.tsx" 2>nul
git rm --cached "lib/bible/plans.ts" 2>nul

git add "app/bible/BibleClient.tsx"
git add "app/bible/page.tsx"
git add "components/layout/Sidebar.tsx"
git add "components/layout/TopBar.tsx"
git add "app/dashboard/DashboardClient.tsx"
git add "app/admin/page.tsx"
git add "app/admin/AdminClient.tsx"

echo Commit...
git commit -m "fix: supprimer Plan Biblique completement — BibleClient nettoye, plans.ts supprime"

echo Push vers Vercel...
git push origin main

echo.
echo ====================================================
echo  Fait ! Vercel va rebuilder automatiquement.
echo ====================================================
pause
