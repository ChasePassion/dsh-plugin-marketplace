@echo off
set LOG=E:\code\dsh-plugin-marketplace\tmp\restart2.log
echo [start] %date% %time% >> "%LOG%"
taskkill /F /PID 41944 >> "%LOG%" 2>&1
taskkill /F /PID 38616 >> "%LOG%" 2>&1
timeout /t 4 /nobreak >> "%LOG%"
powershell -NoProfile -ExecutionPolicy Bypass -File "E:\code\dsh-plugin-marketplace\tmp\finalize-profile.ps1" >> "%LOG%" 2>&1
cd /d E:\code\parlasoul-backend
start "dsh-web" /min cmd /c ""node" "%LOCALAPPDATA%\npm-cache\_npx\1e7f6d9597241db0\node_modules\@deepseek-ai\dsh\lib\bin.js" web >> "%USERPROFILE%\.dsh\tmp-restart-web2.log" 2>&1"
echo [done] %date% %time% >> "%LOG%"
