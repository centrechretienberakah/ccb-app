@echo off
chcp 65001 >nul
cd /D "%~dp0"
git rm --cached ".git/HEAD.lock" 2>nul
del /F ".git\HEAD.lock" 2>nul
del /F ".git\index.lock" 2>nul
git add "app/bible/BibleClient.tsx"
git add "app/bible/read/[book]/[chapter]/ReaderClient.tsx"
git commit -m "Bible: aligner BibleClient + ReaderClient sur le design system (CSS variables, light/dark mode)"
echo.
echo Done. Press any key...
pause >nul
