@echo off
echo ========================================
echo   Errekalde Car Wash - SWAP ENERGIA
echo ========================================
echo.
echo Iniciando servidor local...
echo.
echo El sitio estara disponible en:
echo http://localhost:8080
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

REM Verificar si Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo Por favor, instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

REM Instalar dependencias si es necesario
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
)

REM Iniciar servidor
echo Iniciando servidor HTTP...
npx http-server -p 8080 -o 