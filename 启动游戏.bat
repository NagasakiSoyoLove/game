@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "GO_EXE=C:\go\bin\go.exe"

echo Starting Escape Yunmeng School...
echo.

if not exist "%GO_EXE%" (
  echo Go was not found at: %GO_EXE%
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js/npm was not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist "%FRONTEND%\node_modules" (
  echo First launch: installing frontend dependencies...
  pushd "%FRONTEND%"
  call npm.cmd install
  if errorlevel 1 (
    echo Failed to install frontend dependencies.
    popd
    pause
    exit /b 1
  )
  popd
)

echo Starting backend: http://localhost:8080
start "Yunmeng Backend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%BACKEND%'; & '%GO_EXE%' run main.go"

echo Starting frontend: http://localhost:4200
start "Yunmeng Frontend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%FRONTEND%'; npm.cmd start"

timeout /t 5 /nobreak >nul
start "" "http://localhost:4200"

echo.
echo Game started. Close the backend and frontend windows to stop it.
pause
