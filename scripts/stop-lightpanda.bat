@echo off
chcp 65001 >nul
echo Stopping Lightpanda Browser Service...

REM Check if Docker is available
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed or not running
    exit /b 1
)

REM Stop the container
docker stop lightpanda-browser 2>nul
if %errorlevel% equ 0 (
    echo Lightpanda container stopped successfully
) else (
    echo Container not running or already stopped
)

REM Remove the container (optional)
echo.
echo Do you want to remove the container? (Y/N)
set /p remove=
if /i "%remove%"=="Y" (
    docker rm lightpanda-browser 2>nul
    if %errorlevel% equ 0 (
        echo Container removed successfully
    ) else (
        echo Container already removed or does not exist
    )
)

pause
