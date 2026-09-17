@echo off
title Swedavia FIDS Launcher
cd /d "%~dp0"

echo ===================================================
echo   ✈️  Starting Swedavia FIDS System (Windows)
echo ===================================================

:: 1. Detect Python executable
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

:: 2. Launch FastAPI Backend in a minimized/separate window
echo [1/2] Starting FastAPI Backend on http://localhost:8000...
start "Swedavia FIDS Backend" %PYTHON_EXE% -m uvicorn server:app --host 0.0.0.0 --port 8000

:: 3. Launch Vite Frontend in a minimized/separate window
echo [2/2] Starting Frontend on http://localhost:5173...
start "Swedavia FIDS Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

:: 4. Wait 3 seconds and launch the browser
timeout /t 3 /nobreak >nul
echo Opening Swedavia FIDS in your default browser...
start http://localhost:5173

echo.
echo ===================================================
echo   FIDS is now running live!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000/docs
echo.
echo   Press any key to stop all FIDS servers...
echo ===================================================
pause >nul

:: Graceful cleanup on Windows
taskkill /F /FI "WINDOWTITLE eq Swedavia FIDS Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Swedavia FIDS Frontend*" >nul 2>&1
exit
