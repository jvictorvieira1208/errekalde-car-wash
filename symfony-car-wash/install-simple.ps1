# Script de Instalación Simple - Errekalde Car Wash
# Versión Windows PowerShell

Write-Host "🚗 ERREKALDE CAR WASH - INSTALACIÓN AUTOMÁTICA" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

# Verificar PHP
Write-Host "🔍 Verificando PHP..." -ForegroundColor Yellow
if (Get-Command "php" -ErrorAction SilentlyContinue) {
    $phpVersion = php -r "echo PHP_VERSION;"
    Write-Host "✅ PHP encontrado: $phpVersion" -ForegroundColor Green
} else {
    Write-Host "❌ PHP no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar Composer
Write-Host "🔍 Verificando Composer..." -ForegroundColor Yellow
if (Get-Command "composer" -ErrorAction SilentlyContinue) {
    Write-Host "✅ Composer encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Composer no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar MySQL
Write-Host "🔍 Verificando MySQL..." -ForegroundColor Yellow
if (Get-Command "mysql" -ErrorAction SilentlyContinue) {
    Write-Host "✅ MySQL encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ MySQL no encontrado" -ForegroundColor Red
    exit 1
}

# Instalar dependencias
Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
composer install --optimize-autoloader
Write-Host "✅ Dependencias instaladas" -ForegroundColor Green

# Crear archivo .env
Write-Host "⚙️ Configurando entorno..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    $envContent = @"
APP_ENV=dev
APP_SECRET=your-secret-key-here
DATABASE_URL="mysql://root:@localhost:3306/errekalde_car_wash?serverVersion=mariadb-11.8.0&charset=utf8mb4"
MERCURE_URL=https://127.0.0.1:3000/.well-known/mercure
MERCURE_PUBLIC_URL=https://127.0.0.1:3000/.well-known/mercure
MERCURE_JWT_SECRET="!ChangeThisMercureHubJWTSecretKey!"
CAR_WASH_DEFAULT_SPACES=8
CAR_WASH_WEEKS_AHEAD=12
CAR_WASH_ONLY_WEDNESDAYS=true
FRONTEND_URL=http://localhost:8000
CORS_ALLOW_ORIGIN=http://localhost:8000
N8N_WEBHOOK_URL=https://n8nserver.swapenergia.com/webhook/errekaldecarwash
N8N_VALIDATION_URL=https://n8nserver.swapenergia.com/webhook/validarNumero
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Archivo .env creado" -ForegroundColor Green
} else {
    Write-Host "⚠️ Archivo .env ya existe" -ForegroundColor Yellow
}

# Crear base de datos
Write-Host "🗄️ Configurando base de datos..." -ForegroundColor Yellow
try {
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS errekalde_car_wash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    Write-Host "✅ Base de datos creada" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Error al crear base de datos - puede que ya exista" -ForegroundColor Yellow
}

# Ejecutar migraciones
Write-Host "🔄 Ejecutando migraciones..." -ForegroundColor Yellow
php bin/console doctrine:migrations:migrate --no-interaction
Write-Host "✅ Migraciones completadas" -ForegroundColor Green

# Descargar Mercure
Write-Host "📡 Descargando Mercure..." -ForegroundColor Yellow
if (-not (Test-Path "mercure.exe")) {
    try {
        $mercureUrl = "https://github.com/dunglas/mercure/releases/latest/download/mercure_windows_amd64.zip"
        Invoke-WebRequest -Uri $mercureUrl -OutFile "mercure.zip"
        Expand-Archive -Path "mercure.zip" -DestinationPath "." -Force
        Remove-Item "mercure.zip"
        Write-Host "✅ Mercure descargado" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Error al descargar Mercure - continúa sin él" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ Mercure ya existe" -ForegroundColor Green
}

# Crear configuración Mercure
Write-Host "⚙️ Configurando Mercure..." -ForegroundColor Yellow
$caddyContent = @"
{
    http_port 3000
    https_port 3443
}

localhost:3000

route {
    mercure {
        publish_origins http://localhost:8000
        subscribe_origins http://localhost:8000
        jwt_secret "!ChangeThisMercureHubJWTSecretKey!"
    }
    respond "Not Found" 404
}
"@
$caddyContent | Out-File -FilePath "Caddyfile" -Encoding UTF8
Write-Host "✅ Configuración Mercure creada" -ForegroundColor Green

# Inicializar sistema
Write-Host "🚀 Inicializando sistema..." -ForegroundColor Yellow
php bin/console car-wash:initialize --weeks=12 --spaces=8
Write-Host "✅ Sistema inicializado" -ForegroundColor Green

# Crear scripts de inicio
Write-Host "📝 Creando scripts de inicio..." -ForegroundColor Yellow

# Script completo
$startAll = @"
Write-Host "🚗 Iniciando Sistema Completo..." -ForegroundColor Cyan
if (Test-Path "mercure.exe") {
    Write-Host "📡 Iniciando Mercure..." -ForegroundColor Yellow
    Start-Process -FilePath ".\mercure.exe" -ArgumentList "run", "--config", "Caddyfile" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}
Write-Host "🌐 Iniciando Symfony..." -ForegroundColor Green
if (Get-Command "symfony" -ErrorAction SilentlyContinue) {
    symfony server:start --port=8000
} else {
    php -S localhost:8000 -t public/
}
"@
$startAll | Out-File -FilePath "start-all.ps1" -Encoding UTF8

# Script solo Symfony
$startSymfony = @"
Write-Host "🌐 Iniciando Symfony..." -ForegroundColor Green
if (Get-Command "symfony" -ErrorAction SilentlyContinue) {
    symfony server:start --port=8000
} else {
    php -S localhost:8000 -t public/
}
"@
$startSymfony | Out-File -FilePath "start-symfony.ps1" -Encoding UTF8

# Script solo Mercure
$startMercure = @"
Write-Host "📡 Iniciando Mercure..." -ForegroundColor Yellow
if (Test-Path "mercure.exe") {
    .\mercure.exe run --config Caddyfile
} else {
    Write-Host "❌ Mercure no encontrado" -ForegroundColor Red
}
"@
$startMercure | Out-File -FilePath "start-mercure.ps1" -Encoding UTF8

Write-Host "✅ Scripts creados" -ForegroundColor Green

# Información final
Write-Host ""
Write-Host "🎉 ¡INSTALACIÓN COMPLETADA!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Para iniciar el sistema:" -ForegroundColor Cyan
Write-Host "   .\start-all.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 URLs disponibles:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:8000" -ForegroundColor White
Write-Host "   API: http://localhost:8000/api" -ForegroundColor White
Write-Host "   Health: http://localhost:8000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   php bin/console car-wash:initialize --reset" -ForegroundColor White
Write-Host "   php bin/console cache:clear" -ForegroundColor White
Write-Host ""
Write-Host "✅ ¡Sistema listo para usar!" -ForegroundColor Green 