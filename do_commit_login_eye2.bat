@echo off
cd /D "%~dp0"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
git add app/auth/login/page.tsx app/globals.css
git commit -m "fix: login — icone oeil visible (zIndex, couleur, masque toggle natif navigateur)"
git push origin main
echo Done.
