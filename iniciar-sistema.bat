@echo off
echo ========================================
echo   SISTEMA ERREKALDE CAR WASH
echo   Iniciando servidor de sincronizacion...
echo ========================================

echo.
echo Iniciando servidor backend en puerto 3001...
start "Servidor Backend" cmd /k "node server.js"

echo.
echo Esperando 3 segundos para que el servidor inicie...
timeout /t 3 /nobreak > nul

echo.
echo Iniciando servidor frontend en puerto 8080...
start "Frontend" cmd /k "npx http-server -p 8080 -o"

echo.
echo ========================================
echo   SISTEMA INICIADO CORRECTAMENTE
echo   Backend: http://localhost:3001
echo   Frontend: http://localhost:8080
echo ========================================
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause > nul 