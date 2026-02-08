@echo off
echo === TESTE DO WORKER C# ===
echo.
echo Este script vai testar se o worker.exe consegue mover o mouse.
echo Voce deve ver o mouse ir para o centro da tela.
echo.
pause

cd /d "%~dp0"
cd electron

echo Testando worker.exe...
echo M,0.5,0.5 | worker.exe

echo.
echo Se o mouse NAO mexeu, o worker esta crashando ou com permissoes negadas.
echo Se mexeu, o problema esta na comunicacao Electron.
echo.
pause
