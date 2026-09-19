@echo off
set "SCRIPT_DIR=%~dp0"

echo ==========================================
echo Ignite Agent - Quick Start
echo ==========================================
echo.

REM Check if venv exists
if not exist "%SCRIPT_DIR%venv\Scripts\python.exe" (
    echo Virtual environment not found. Running setup first...
    call "%SCRIPT_DIR%setup.bat"
    if errorlevel 1 (
        echo ERROR: Setup failed.
        exit /b 1
    )
    exit /b
)

echo Starting Backend...
start "Backend Server" powershell -NoExit -Command "Set-Location '%SCRIPT_DIR%backend'; & '..\venv\Scripts\python.exe' -m uvicorn main:app --reload --port 8000"

echo Starting Frontend...
start "Frontend Server" powershell -NoExit -Command "Set-Location '%SCRIPT_DIR%frontend'; npm run dev"

echo.
echo ==========================================
echo Servers starting...
echo ==========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo ==========================================
pause
