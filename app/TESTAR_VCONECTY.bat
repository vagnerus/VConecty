@echo off
echo Iniciando VConectY...
cd /d "%~dp0"
call npm run electron:dev
pause
