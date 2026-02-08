@echo off
title VConectY - Remote Access
echo.
echo ====================================
echo    VConectY Portable v1.0
echo ====================================
echo.
echo Iniciando aplicacao...
echo.

cd /d "%~dp0"

REM Verifica se node_modules existe
if not exist "node_modules\electron" (
    echo ERRO: Dependencias nao encontradas!
    echo Execute: npm install
    pause
    exit /b 1
)

REM Inicia o Electron
start "" "node_modules\electron\dist\electron.exe" .

echo.
echo App iniciado!
echo Feche esta janela quando terminar.
echo.
