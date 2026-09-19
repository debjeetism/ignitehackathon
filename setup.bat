@echo off
set "SCRIPT_DIR=%~dp0"

echo ==========================================
echo Trace Control - Setup Script
echo ==========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    exit /b 1
)

if not exist "%SCRIPT_DIR%venv\Scripts\python.exe" (
    echo [1/5] Creating virtual environment...
    python -m venv "%SCRIPT_DIR%venv"
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        exit /b 1
    )
) else (
    echo [1/5] Virtual environment already exists.
)

echo [2/5] Activating local virtual environment...
call "%SCRIPT_DIR%venv\Scripts\activate.bat"

echo [3/5] Upgrading pip...
python -m pip install --upgrade pip

echo [4/5] Installing backend dependencies...
pip install -r "%SCRIPT_DIR%backend\requirements.txt"
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    exit /b 1
)

echo [5/5] Installing frontend dependencies...
cd /d "%SCRIPT_DIR%frontend"
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies
    cd ..
    exit /b 1
)
cd /d "%SCRIPT_DIR%"

echo.
echo ==========================================
echo Setup completed successfully!
echo ==========================================
echo.
echo To start the application:
echo   1. Backend: Set-Location backend; ..\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
echo   2. Frontend: Set-Location frontend; npm run dev
echo.
echo Don't forget to:
echo   - Copy backend\.env.example to backend\.env and add your API keys
echo.
pause
