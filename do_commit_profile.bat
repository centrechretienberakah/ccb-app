@echo off
cd /d "C:\Users\RVREND~1\ccb-app"
del /f "C:\Users\RVREND~1\ccb-app\.git\index.lock" 2>nul
del /f "C:\Users\RVREND~1\ccb-app\.git\HEAD.lock" 2>nul
"C:\Program Files\Git\cmd\git.exe" add app/profile/ProfileClient.tsx
"C:\Program Files\Git\cmd\git.exe" add app/dashboard/page.tsx
"C:\Program Files\Git\cmd\git.exe" add supabase_profile_missing_tables.sql
"C:\Program Files\Git\cmd\git.exe" commit -m "Feat: profil membre - navigation, avatar dashboard, tables SQL"
"C:\Program Files\Git\cmd\git.exe" push origin main
echo EXIT_CODE=%ERRORLEVEL%
