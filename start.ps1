# GovChain Startup Script for Windows PowerShell
# This script starts both backend and frontend servers

Write-Host "🚀 Starting GovChain..." -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
$mongoProcess = Get-Process mongod -ErrorAction SilentlyContinue
if (-not $mongoProcess) {
    Write-Host "⚠️  Warning: MongoDB doesn't appear to be running" -ForegroundColor Yellow
    Write-Host "   Please start MongoDB or use MongoDB Atlas" -ForegroundColor Yellow
    Write-Host "   See START.md for instructions" -ForegroundColor Yellow
    Write-Host ""
}

# Check if node_modules exist
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
}

if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
}

Write-Host "✅ Dependencies ready" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Starting services..." -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Start backend
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location backend
    npm run dev
}

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location frontend
    npm run dev
}

# Function to display job output
function Show-JobOutput {
    param($Job, $Name)
    
    $output = Receive-Job -Job $Job
    if ($output) {
        Write-Host "[$Name] " -NoNewline -ForegroundColor Cyan
        Write-Host $output
    }
}

# Monitor both jobs
try {
    while ($true) {
        Show-JobOutput -Job $backendJob -Name "Backend"
        Show-JobOutput -Job $frontendJob -Name "Frontend"
        
        # Check if jobs are still running
        if ($backendJob.State -ne "Running" -or $frontendJob.State -ne "Running") {
            Write-Host ""
            Write-Host "⚠️  One or more services stopped unexpectedly" -ForegroundColor Red
            break
        }
        
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host ""
    Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
    
    Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
    
    Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue
    Remove-Job -Job $frontendJob -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ Services stopped" -ForegroundColor Green
}
