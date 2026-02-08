@echo off
echo Iniciando servidor local para teste...
cd /d "C:\Users\Vagner\Desktop\VCONECTY\server"
echo.
echo Servidor estara em: http://localhost:3000
echo.
start cmd /k "npm start"
timeout /t 3
echo.
echo Abra o VConectY e configure o servidor para: http://localhost:3000
echo.
pause
