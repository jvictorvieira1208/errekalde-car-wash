@echo off
title PROBAR DATABASE CENTRALIZADA - Errekalde Car Wash
color 0A

echo.
echo ========================================
echo   🗄️ PROBAR DATABASE CENTRALIZADA
echo   Errekalde Car Wash - SWAP ENERGIA
echo ========================================
echo.

echo [1/5] Verificando dependencias...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Node.js no está instalado
    echo    📥 Instalar desde: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo    ✅ Node.js disponible
)

echo.
echo [2/5] Probando N8N desde terminal...
echo    📡 Ejecutando test-n8n-centralizado.js...
node test-n8n-centralizado.js
if %errorlevel% neq 0 (
    echo    ⚠️ Algunas pruebas fallaron
) else (
    echo    ✅ Todas las pruebas pasaron
)

echo.
echo [3/5] Abriendo pruebas en navegador...
echo    🌐 Abriendo PROBAR-N8N-CENTRALIZADO.html...
start PROBAR-N8N-CENTRALIZADO.html

echo.
echo [4/5] Abriendo URL pública...
echo    🌍 Abriendo https://errekalde-car-wash.surge.sh/...
start https://errekalde-car-wash.surge.sh/

echo.
echo [5/5] Instrucciones de prueba...
echo.
echo ========================================
echo   🧪 CÓMO PROBAR LA DATABASE CENTRALIZADA
echo ========================================
echo.
echo 1. En el navegador que se abrió:
echo    • Ejecutar todas las pruebas
echo    • Verificar que todas pasen ✅
echo.
echo 2. En la URL pública:
echo    • Seleccionar una fecha
echo    • Completar el formulario
echo    • Hacer una reserva
echo    • Verificar que los espacios se actualicen
echo.
echo 3. Probar múltiples dispositivos:
echo    • Abrir en PC y móvil
echo    • Hacer reserva en uno
echo    • Verificar que el otro se actualice
echo.
echo 4. Indicadores de estado:
echo    • 🟢 Conectado = N8N funcionando
echo    • 🟡 Sincronizando = Actualizando datos
echo    • 🔴 Desconectado = Problema con N8N
echo.
echo ========================================
echo   🎯 RESULTADO ESPERADO
echo ========================================
echo.
echo ✅ TODAS las personas que accedan a:
echo    https://errekalde-car-wash.surge.sh/
echo.
echo ✅ Modifican la MISMA base de datos en N8N
echo.
echo ✅ Los cambios se reflejan en TODOS los dispositivos
echo    automáticamente en 3-5 segundos
echo.
echo ========================================
echo   📋 ARCHIVOS DE CONFIGURACIÓN
echo ========================================
echo.
echo 📄 INSTRUCCIONES-DATABASE-CENTRALIZADA.md
echo    → Guía completa paso a paso
echo.
echo 📄 CONFIGURAR-N8N-DATABASE.md
echo    → Configuración técnica de N8N
echo.
echo 📄 n8n-database-config.json
echo    → Estructura de datos requerida
echo.
echo ========================================
echo   🚨 SI ALGO NO FUNCIONA
echo ========================================
echo.
echo 1. Revisar que N8N tenga los workflows:
echo    • Errekalde Espacios Centralizado
echo    • Errekalde Reservas Centralizado
echo    • Errekalde Verificación
echo.
echo 2. Verificar endpoints N8N:
echo    • /errekaldecarwash-spaces
echo    • /errekaldecarwash
echo    • /validarNúmero
echo.
echo 3. Comprobar variables globales:
echo    • errekalde_espacios_global
echo    • errekalde_reservas_global
echo.
echo 4. Verificar CORS headers habilitados
echo.
echo ========================================
echo.
echo Presiona cualquier tecla para cerrar...
pause > nul

echo.
echo ¡Configuración completada!
echo.
echo 🎉 Si todo funciona correctamente,
echo    ya tienes una base de datos centralizada
echo    universal funcionando con N8N.
echo.
echo 📞 URL final: https://errekalde-car-wash.surge.sh/
echo.
pause 