@echo off
title SISTEMA ERREKALDE CAR WASH - Sincronizacion Global
color 0A

echo.
echo ========================================
echo   🚗 ERREKALDE CAR WASH
echo   Sistema de Sincronizacion Global
echo ========================================
echo.

echo [1/4] Verificando dependencias...
if not exist "node_modules" (
    echo    Instalando dependencias...
    npm install
    if errorlevel 1 (
        echo    ❌ Error instalando dependencias
        pause
        exit /b 1
    )
) else (
    echo    ✅ Dependencias ya instaladas
)

echo.
echo [2/4] Iniciando servidor backend (puerto 3001)...
start "Servidor Backend - Errekalde Car Wash" cmd /k "title Servidor Backend && color 0B && echo Iniciando servidor backend... && node server.js"

echo    Esperando 3 segundos para que el servidor inicie...
timeout /t 3 /nobreak > nul

echo.
echo [3/4] Verificando servidor backend...
powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:3001/api/sync-espacios' -Method GET -TimeoutSec 5; Write-Host '    ✅ Servidor backend funcionando correctamente'; } catch { Write-Host '    ⚠️ Servidor backend no responde, pero continuando...'; }"

echo.
echo [4/4] Iniciando servidor frontend (puerto 8080)...
start "Frontend - Errekalde Car Wash" cmd /k "title Frontend && color 0E && echo Iniciando servidor frontend... && npx http-server -p 8080 -o"

echo.
echo ========================================
echo   🎉 SISTEMA INICIADO CORRECTAMENTE
echo ========================================
echo.
echo 📍 URLs de acceso:
echo    Frontend: http://localhost:8080
echo    Backend:  http://localhost:3001
echo    Test:     http://localhost:8080/test-sistema.html
echo.
echo 🔄 Sincronizacion global activa:
echo    - Espacios disponibles en tiempo real
echo    - Actualizacion cada 5 segundos
echo    - Solo miércoles disponibles
echo    - 8 espacios por miércoles
echo.
echo 📱 Para acceder desde otros dispositivos:
echo    http://[IP-DE-TU-PC]:8080
echo.
echo ⚠️  IMPORTANTE: Mantener ambas ventanas abiertas
echo.
echo Presiona cualquier tecla para abrir el navegador...
pause > nul

echo.
echo Abriendo navegador...
start http://localhost:8080

echo.
echo ========================================
echo   Sistema listo para usar
echo   Cerrar esta ventana cuando termines
echo ========================================
echo.
pause 