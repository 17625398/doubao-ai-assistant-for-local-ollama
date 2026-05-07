@echo off
chcp 65001 >nul
echo Starting Lightpanda Browser Service...

REM Check if Docker is available
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed or not running
    exit /b 1
)

REM Check if container already exists
docker ps -a --filter "name=lightpanda-browser" --format "{{.Names}}" | findstr "lightpanda-browser" >nul
if %errorlevel% equ 0 (
    echo Container already exists, starting it...
    docker start lightpanda-browser
) else (
    echo Creating new Lightpanda container...
    docker run -d --name lightpanda-browser -p 9222:9222 -e LIGHTPANDA_DISABLE_TELEMETRY=true lightpanda/browser:nightly
)

if %errorlevel% neq 0 (
    echo Error: Failed to start Lightpanda container
    exit /b 1
)

echo Lightpanda is starting...
echo Waiting for service to be ready...

REM Wait for service to be ready
timeout /t 5 /nobreak >nul

REM Check if service is responding
curl -s -o nul -w "%%{http_code}" http://localhost:9222 | findstr "200\|404" >nul
if %errorlevel% equ 0 (
    echo Lightpanda is ready!
    echo CDP Endpoint: ws://localhost:9222
) else (
    echo Warning: Service may not be fully ready yet
    echo Please wait a few more seconds and check again
)

pause
