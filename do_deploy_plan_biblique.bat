@echo off
cd /d C:\Users\Révérend\ccb-app

echo === Nettoyage index git si corrompu ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === Ajout de tous les fichiers ===
git add lib/bible/reading-plans.ts
git add lib/bible/versions.ts
git add app/plan-biblique/page.tsx
git add app/plan-biblique/PlanBibliqueClient.tsx
git add app/api/bible/route.ts
git add app/api/bible-list/route.ts
git add app/bible/BibleClient.tsx
git add app/bible/read/[book]/[chapter]/ReaderClient.tsx
git add app/page.tsx
git add components/layout/Sidebar.tsx
git add components/layout/TopBar.tsx
git add supabase/reading_plans.sql

echo === Statut ===
git status

echo === Commit ===
git commit -m "feat: Plan Biblique + multi-versions Bible + navigation mise a jour"

echo === Push ===
git push origin main

echo.
echo === Done! ===
echo N'oubliez pas d'executer le SQL dans votre dashboard Supabase :
echo supabase/reading_plans.sql
echo.
pause
