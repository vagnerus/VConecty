@echo off
echo ========================================
echo    VConectY - INICIALIZADOR CORRETO
echo ========================================
echo.
echo Matando processos de desenvolvimento...
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo Abrindo executavel compilado (v25)...
cd /d "%~dp0"
start "" "release\VConectY-Portable.exe"

echo.
echo ========================================
echo  IMPORTANTE: Pressione F12 no app!
echo ========================================
echo.
echo Voce deve ver no Console:
echo   [WORKER OUT] WORKER READY
echo   [MAIN] Received robot-control
echo   [ROBOT] Sending to worker
echo.
echo Se NAO aparecer = ainda esta errado!
echo ========================================
pause
