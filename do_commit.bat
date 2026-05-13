@echo off
cd /d "C:\Users\RVREND~1\ccb-app"
del /f "C:\Users\RVREND~1\ccb-app\.git\index.lock" 2>nul
del /f "C:\Users\RVREND~1\ccb-app\.git\HEAD.lock" 2>nul
"C:\Program Files\Git\cmd\git.exe" add app/community/FeedClient.tsx
"C:\Program Files\Git\cmd\git.exe" add app/community/page.tsx
"C:\Program Files\Git\cmd\git.exe" add app/community/CommunityClient.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "Fix feed: fetch user_profiles separement (no embedded join 400) + window cache + logs"
"C:\Program Files\Git\cmd\git.exe" add app/prayer/page.tsx
"C:\Program Files\Git\cmd\git.exe" add app/prayer/PrayerClient.tsx
"C:\Program Files\Git\cmd\git.exe" add supabase_prayer_schema.sql
"C:\Program Files\Git\cmd\git.exe" commit -m "Feat: section intercession - requetes de priere + bouton Je prie pour toi"
"C:\Program Files\Git\cmd\git.exe" push origin main
