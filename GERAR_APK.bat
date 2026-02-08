@echo off
TITLE Gerador de APK VConectY
COLOR 0A

echo ===================================================
echo      GERADOR DE APK ANDROID - VCONECTY
echo ===================================================
echo.
echo Este script ira compilar a versao Android do VConectY.
echo REQUISITOS:
echo  - Java JDK 17+ instalado
echo  - Android Studio / Android SDK instalado e configurado
echo.
pause

echo.
echo [1/3] Construindo Frontend (Vite)...
cd app
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao construir o frontend.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Sincronizando com Android Project (Capacitor)...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao sincronizar com Android.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Compilando APK (Gradle)...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo [ERRO] Falha na compilacao do Gradle.
    echo Verifique se o JAVA_HOME esta configurado corretamente.
    echo Ou abra a pasta 'app/android' no Android Studio e compile por la.
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo      SUCESSO! APK GERADO COM SUCESSO
echo ===================================================
echo.
echo O arquivo APK esta em:
echo app\android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
