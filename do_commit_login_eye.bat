@echo off
cd /D "%~dp0"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
git add app/auth/login/page.tsx
git commit -m "feat: login — toggle visibilite mot de passe (icone oeil)"
git push origin main
echo Done.
