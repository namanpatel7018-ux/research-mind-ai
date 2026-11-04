# ResearchMind AI - Project Startup Script
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      Starting ResearchMind AI System      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Clean up existing processes on port 8000 or 4173 to prevent address-in-use errors
Write-Host "Checking for existing processes on ports 8000 & 4173..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 8000, 4173 -ErrorAction SilentlyContinue | ForEach-Object {
    $procId = $_.OwningProcess
    if ($procId -and $procId -ne $PID) {
        Write-Host "Releasing occupied port $($_.LocalPort) (PID: $procId)..." -ForegroundColor DarkGray
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1

# Start Backend
Write-Host "Starting Backend API (FastAPI on Port 8000)..." -ForegroundColor Yellow
$BackendDir = Join-Path $PSScriptRoot "backend"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

if (Test-Path $VenvPython) {
    $PythonCmd = "& '$VenvPython'"
} else {
    $PythonCmd = "python"
}

Start-Process powershell -WorkingDirectory $BackendDir -ArgumentList "-ExecutionPolicy Bypass -NoExit -Command `"$PythonCmd -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload`""

# Wait for backend to initialize
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend (Vite on Port 4173)..." -ForegroundColor Yellow
$FrontendDir = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -WorkingDirectory $FrontendDir -ArgumentList "-ExecutionPolicy Bypass -NoExit -Command `"npm run dev`""

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "      ResearchMind AI Started Successfully!  " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  http://localhost:4173" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening your browser to http://localhost:4173 ..." -ForegroundColor Green
Write-Host ""
Start-Process "http://localhost:4173"
