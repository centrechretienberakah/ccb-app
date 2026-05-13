@echo off
cd /D "%~dp0"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
git add app/page.tsx
git commit -m "refactor: page accueil — remplacer couleurs hardcodees par CSS variables design system"
git push origin main
echo Done.
