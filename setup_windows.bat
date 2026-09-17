@echo off
title Swedavia FIDS Initial Setup (Windows)
cd /d "%~dp0"

echo ===================================================
echo   ✈️  Setting up Swedavia FIDS on Windows
echo ===================================================

:: 1. Setup Python Virtual Environment
echo [1/3] Creating Python virtual environment...
python -m venv .venv
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found or failed to create .venv. Please install Python 3.10+ and add to PATH.
    pause
    exit /b 1
)

:: 2. Install Python Dependencies
echo [2/3] Installing Python backend dependencies...
call .venv\Scripts\pip install -r requirements.txt

:: 3. Install Node.js Frontend Dependencies
echo [3/3] Installing Frontend dependencies (npm)...
cd frontend
call npm install
cd ..

echo.
echo ===================================================
echo   ✅ Setup complete!
echo   You can now launch the app by double-clicking start.bat
echo ===================================================
pause
