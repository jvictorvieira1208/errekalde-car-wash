@echo off
title PRUEBA DE SINCRONIZACION EN TIEMPO REAL
color 0A

echo.
echo ========================================
echo   🔄 PRUEBA DE SINCRONIZACION
echo   Sistema de Tiempo Real
echo ========================================
echo.

echo [1/3] Terminando procesos anteriores...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak > nul

echo.
echo [2/3] Iniciando servidor backend...
start "Backend" cmd /k "title BACKEND MYSQL && color 0B && node server.js"

echo    Esperando que inicie el servidor...
timeout /t 4 /nobreak > nul

echo.
echo [3/3] Iniciando servidor frontend...
start "Frontend" cmd /k "title FRONTEND && color 0E && npx http-server -p 8080"

echo    Esperando que inicie el frontend...
timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo   🎯 INSTRUCCIONES DE PRUEBA
echo ========================================
echo.
echo 1. Se abriran 2 navegadores automaticamente
echo 2. Haz una reserva en el PRIMER navegador
echo 3. Ve como los espacios se actualizan automaticamente
echo    en el SEGUNDO navegador (en 3-5 segundos)
echo 4. El indicador de sincronizacion cambiara de color:
echo    🟢 Conectado - 🟡 Sincronizando - 🔴 Desconectado
echo.
echo ========================================
echo   🌐 ABRIENDO NAVEGADORES...
echo ========================================
echo.

echo Navegador 1 (DISPOSITIVO 1):
start http://localhost:8080
timeout /t 2 /nobreak > nul

echo Navegador 2 (DISPOSITIVO 2):
start http://localhost:8080
timeout /t 2 /nobreak > nul

echo.
echo Demo de sincronizacion (opcional):
start http://localhost:8080/test-sync-real.html

echo.
echo ========================================
echo   ✅ SISTEMA LISTO PARA PRUEBAS
echo ========================================
echo.
echo 🔄 La sincronizacion ocurre cada 3 segundos
echo 📱 Simula multiples dispositivos con multiples pestanas
echo 🎯 Haz reservas y observa la sincronizacion instantanea
echo.
echo NOTA: Mantener esta ventana abierta durante las pruebas
echo      Cerrar para terminar todos los servidores
echo.
pause 