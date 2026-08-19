@echo off
chcp 65001 > nul
echo ===================================================
echo 🚀 CONCILIA ROUANET - INICIANDO SISTEMA INTEGRADO
echo ===================================================
echo.

echo [1/3] Verificando Docker e PostgreSQL...
docker-compose up -d postgres

echo [2/3] Iniciando Backend FastAPI...
start "Backend FastAPI" cmd /k "python -m uvicorn backend.main:app --port 8000 --reload"

echo [3/3] Iniciando Frontend React (Vite)...
start "Frontend React" cmd /k "npm run dev"

echo.
echo ✅ Todos os serviços foram disparados!
echo • Frontend: http://localhost:5173
echo • Backend API Docs: http://localhost:8000/docs
echo.
pause
