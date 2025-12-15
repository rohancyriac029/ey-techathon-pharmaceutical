# Start both backend and frontend servers

Write-Host "🚀 Starting Pharmaceutical Intelligence Platform..." -ForegroundColor Cyan

# Start backend in background
Write-Host "`n📦 Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend in background
Write-Host "🎨 Starting frontend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`n✅ Both servers are starting!" -ForegroundColor Green
Write-Host "`n📊 Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🌐 Frontend UI: http://localhost:5173" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C in each terminal window to stop the servers." -ForegroundColor Gray
