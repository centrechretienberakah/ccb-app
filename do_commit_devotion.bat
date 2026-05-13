@echo off
cd /d "C:\Users\RVREND~1\ccb-app"
del /f "C:\Users\RVREND~1\ccb-app\.git\index.lock" 2>nul
"C:\Program Files\Git\cmd\git.exe" add app/devotion/page.tsx
"C:\Program Files\Git\cmd\git.exe" add app/devotion/DevotionClient.tsx
"C:\Program Files\Git\cmd\git.exe" add app/devotion/devotions-data.ts
"C:\Program Files\Git\cmd\git.exe" add app/globals.css
"C:\Program Files\Git\cmd\git.exe" add supabase_devotions.sql
"C:\Program Files\Git\cmd\git.exe" commit -m "Devotion du Jour: redesign premium + 7 devotions statiques + streak + partage"
"C:\Program Files\Git\cmd\git.exe" push origin main
echo EXIT_CODE=%ERRORLEVEL%
