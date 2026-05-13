@echo off
cd /d "C:\Users\RVREND~1\ccb-app"
del /f "C:\Users\RVREND~1\ccb-app\.git\index.lock" 2>nul
"C:\Program Files\Git\cmd\git.exe" add components/icons.tsx
"C:\Program Files\Git\cmd\git.exe" add components/layout/AppShell.tsx
"C:\Program Files\Git\cmd\git.exe" add components/layout/Sidebar.tsx
"C:\Program Files\Git\cmd\git.exe" add components/layout/BottomNav.tsx
"C:\Program Files\Git\cmd\git.exe" add components/layout/TopBar.tsx
"C:\Program Files\Git\cmd\git.exe" add app/layout.tsx
"C:\Program Files\Git\cmd\git.exe" add app/globals.css
"C:\Program Files\Git\cmd\git.exe" add app/dashboard/page.tsx
"C:\Program Files\Git\cmd\git.exe" add app/dashboard/DashboardClient.tsx
"C:\Program Files\Git\cmd\git.exe" add app/prayer/PrayerClient.tsx
"C:\Program Files\Git\cmd\git.exe" add app/community/CommunityClient.tsx
"C:\Program Files\Git\cmd\git.exe" add app/profile/ProfileClient.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "Design System CCB: AppShell + Sidebar + BottomNav + TopBar + Dashboard redesign"
"C:\Program Files\Git\cmd\git.exe" push origin main
echo EXIT_CODE=%ERRORLEVEL%
