@echo off
set LOG=E:\code\dsh-plugin-marketplace\tmp\restart.log
echo [start] %date% %time% >> "%LOG%"
taskkill /F /PID 28472 >> "%LOG%" 2>&1
taskkill /F /PID 25992 >> "%LOG%" 2>&1
timeout /t 3 /nobreak >> "%LOG%"
powershell -NoProfile -ExecutionPolicy Bypass -File "E:\code\dsh-plugin-marketplace\tmp\finalize-profile.ps1" >> "%LOG%" 2>&1
cd /d E:\code\parlasoul-backend
set DSH_HOME=%USERPROFILE%\.dsh
start "dsh-web" /min cmd /c ""node" "%LOCALAPPDATA%\npm-cache\_npx\1e7f6d9597241db0\node_modules\@deepseek-ai\dsh\lib\bin.js" web >> "%USERPROFILE%\.dsh\tmp-restart-web.log" 2>&1"
echo [done] %date% %time% >> "%LOG%"
