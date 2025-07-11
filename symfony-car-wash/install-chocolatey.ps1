# Script de Instalación con Chocolatey - Errekalde Car Wash
# Instala prerrequisitos usando Chocolatey

Write-Host "🚗 ERREKALDE CAR WASH - INSTALACION AUTOMATICA" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Función para verificar si comando existe
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Verificar si Chocolatey está instalado
Write-Host "🔍 Verificando Chocolatey..." -ForegroundColor Yellow
if (-not (Test-Command "choco")) {
    Write-Host "📦 Instalando Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Actualizar PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "✅ Chocolatey instalado" -ForegroundColor Green
} else {
    Write-Host "✅ Chocolatey ya está instalado" -ForegroundColor Green
}

# Instalar PHP
Write-Host "🔍 Verificando PHP..." -ForegroundColor Yellow
if (-not (Test-Command "php")) {
    Write-Host "📦 Instalando PHP..." -ForegroundColor Yellow
    choco install php -y
    refreshenv
    Write-Host "✅ PHP instalado" -ForegroundColor Green
} else {
    Write-Host "✅ PHP ya está instalado" -ForegroundColor Green
}

# Instalar Composer
Write-Host "🔍 Verificando Composer..." -ForegroundColor Yellow
if (-not (Test-Command "composer")) {
    Write-Host "📦 Instalando Composer..." -ForegroundColor Yellow
    choco install composer -y
    refreshenv
    Write-Host "✅ Composer instalado" -ForegroundColor Green
} else {
    Write-Host "✅ Composer ya está instalado" -ForegroundColor Green
}

# Instalar MySQL
Write-Host "🔍 Verificando MySQL..." -ForegroundColor Yellow
if (-not (Test-Command "mysql")) {
    Write-Host "📦 Instalando MySQL..." -ForegroundColor Yellow
    choco install mysql -y
    refreshenv
    Write-Host "✅ MySQL instalado" -ForegroundColor Green
} else {
    Write-Host "✅ MySQL ya está instalado" -ForegroundColor Green
}

# Actualizar variables de entorno
Write-Host "🔄 Actualizando variables de entorno..." -ForegroundColor Yellow
refreshenv

# Verificar instalaciones
Write-Host "🔍 Verificando instalaciones..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Mostrar versiones
Write-Host "📊 Versiones instaladas:" -ForegroundColor Cyan
try {
    $phpVersion = php -r "echo PHP_VERSION;"
    Write-Host "  PHP: $phpVersion" -ForegroundColor Green
} catch {
    Write-Host "  PHP: Error al obtener versión" -ForegroundColor Red
}

try {
    $composerVersion = composer --version
    Write-Host "  Composer: OK" -ForegroundColor Green
} catch {
    Write-Host "  Composer: Error" -ForegroundColor Red
}

try {
    $mysqlVersion = mysql --version
    Write-Host "  MySQL: OK" -ForegroundColor Green
} catch {
    Write-Host "  MySQL: Error" -ForegroundColor Red
}

# Continuar con instalación del proyecto
Write-Host ""
Write-Host "🚀 Instalando dependencias del proyecto..." -ForegroundColor Yellow

# Instalar dependencias PHP
Write-Host "📦 Instalando dependencias PHP..." -ForegroundColor Yellow
try {
    composer install --optimize-autoloader
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
    Write-Host "Intenta manualmente: composer install" -ForegroundColor Yellow
}

# Crear archivo .env
Write-Host "⚙️ Creando archivo .env..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    $envLines = @(
        "APP_ENV=dev",
        "APP_SECRET=your-secret-key-here-change-this",
        "DATABASE_URL=mysql://root:@localhost:3306/errekalde_car_wash?serverVersion=8.0.32&charset=utf8mb4",
        "MERCURE_URL=https://127.0.0.1:3000/.well-known/mercure",
        "MERCURE_PUBLIC_URL=https://127.0.0.1:3000/.well-known/mercure",
        "MERCURE_JWT_SECRET=!ChangeThisMercureHubJWTSecretKey!",
        "CAR_WASH_DEFAULT_SPACES=8",
        "CAR_WASH_WEEKS_AHEAD=12",
        "CAR_WASH_ONLY_WEDNESDAYS=true",
        "FRONTEND_URL=http://localhost:8000",
        "CORS_ALLOW_ORIGIN=http://localhost:8000",
        "N8N_WEBHOOK_URL=https://n8nserver.swapenergia.com/webhook/errekaldecarwash",
        "N8N_VALIDATION_URL=https://n8nserver.swapenergia.com/webhook/validarNumero"
    )
    $envLines | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Archivo .env creado" -ForegroundColor Green
} else {
    Write-Host "⚠️ Archivo .env ya existe" -ForegroundColor Yellow
}

# Crear script de inicio
Write-Host "📝 Creando script de inicio..." -ForegroundColor Yellow
$startLines = @(
    "Write-Host '🚗 Iniciando Errekalde Car Wash...' -ForegroundColor Cyan",
    "Write-Host '=================================' -ForegroundColor Green",
    "Write-Host ''",
    "if (Get-Command 'symfony' -ErrorAction SilentlyContinue) {",
    "    Write-Host '🌐 Iniciando con Symfony CLI...' -ForegroundColor Green",
    "    symfony server:start --port=8000",
    "} else {",
    "    Write-Host '🌐 Iniciando con PHP built-in server...' -ForegroundColor Green",
    "    php -S localhost:8000 -t public/",
    "}"
)
$startLines | Out-File -FilePath "start.ps1" -Encoding UTF8
Write-Host "✅ Script de inicio creado" -ForegroundColor Green

# Información final
Write-Host ""
Write-Host "🎉 INSTALACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "1. Reinicia PowerShell para actualizar PATH" -ForegroundColor White
Write-Host "2. Configura MySQL:" -ForegroundColor White
Write-Host "   - Inicia servicio: net start mysql" -ForegroundColor Yellow
Write-Host "   - Configura root: mysql -u root" -ForegroundColor Yellow
Write-Host "3. Crea base de datos:" -ForegroundColor White
Write-Host "   mysql -u root -e 'CREATE DATABASE errekalde_car_wash;'" -ForegroundColor Yellow
Write-Host "4. Ejecuta migraciones:" -ForegroundColor White
Write-Host "   php bin/console doctrine:migrations:migrate" -ForegroundColor Yellow
Write-Host "5. Inicializa sistema:" -ForegroundColor White
Write-Host "   php bin/console car-wash:initialize" -ForegroundColor Yellow
Write-Host "6. Inicia servidor:" -ForegroundColor White
Write-Host "   .\start.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 URL: http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "📞 Si hay problemas, ejecuta cada paso manualmente" -ForegroundColor Yellow 