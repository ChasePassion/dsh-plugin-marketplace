@echo off
set LOG=E:\code\dsh-plugin-marketplace\tmp\restart3.log
echo [start] %date% %time% >> "%LOG%"
for /f "tokens=2 delims==" %%i in ('wmic process where "name='node.exe' and commandline like '%%dsh%%'" get processid /value ^| find "="') do taskkill /F /PID %%i >> "%LOG%" 2>&1
timeout /t 5 /nobreak >> "%LOG%"
cd /d E:\code\parlasoul-backend
start "dsh-web" /min cmd /c ""node" "%LOCALAPPDATA%\npm-cache\_npx\1e7f6d9597241db0\node_modules\@deepseek-ai\dsh\lib\bin.js" web >> "%USERPROFILE%\.dsh\tmp-restart-web3.log" 2>&1"
echo [done] %date% %time% >> "%LOG%"
