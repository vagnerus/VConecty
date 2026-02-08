@echo off
TITLE Build VConectY

echo Killing processes...
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

echo Cleaning release folder...
if exist release (
    echo Deleting release folder...
    rmdir /s /q release
    if exist release (
        echo Failed to delete release. Renaming...
        ren release release_%RANDOM%
    )
)

echo Building Frontend...
call npm run build

echo Building Electron...
call npx electron-builder --win --x64

echo Deploying to Server...
robocopy "dist" "..\server\public" /E /IS

echo Done!
pause
