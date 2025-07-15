@echo off
echo === Running npm build ===
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed. Aborting deployment.
    pause
    exit /b %errorlevel%
)

echo === Build succeeded. Deploying to Firebase ===
call firebase deploy

if %errorlevel% neq 0 (
    echo ❌ Deployment failed.
    pause
    exit /b %errorlevel%
)

echo ✅ Deployment successful!
pause
