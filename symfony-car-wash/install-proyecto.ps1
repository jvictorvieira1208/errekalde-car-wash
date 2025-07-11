# Script Simple - Solo Proyecto Symfony
# Asume que PHP, Composer y MySQL ya están instalados

Write-Host "🚗 INSTALANDO PROYECTO ERREKALDE CAR WASH" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Verificar herramientas
Write-Host "🔍 Verificando herramientas..." -ForegroundColor Yellow

$tools = @()
if (Get-Command "php" -ErrorAction SilentlyContinue) {
    $phpVersion = php -r "echo PHP_VERSION;"
    Write-Host "✅ PHP: $phpVersion" -ForegroundColor Green
} else {
    Write-Host "❌ PHP no encontrado" -ForegroundColor Red
    $tools += "PHP"
}

if (Get-Command "composer" -ErrorAction SilentlyContinue) {
    Write-Host "✅ Composer: OK" -ForegroundColor Green
} else {
    Write-Host "❌ Composer no encontrado" -ForegroundColor Red
    $tools += "Composer"
}

if (Get-Command "mysql" -ErrorAction SilentlyContinue) {
    Write-Host "✅ MySQL: OK" -ForegroundColor Green
} else {
    Write-Host "❌ MySQL no encontrado" -ForegroundColor Red
    $tools += "MySQL"
}

if ($tools.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Faltan herramientas: $($tools -join ', ')" -ForegroundColor Red
    Write-Host "📖 Consulta INSTALACION-MANUAL.md para instrucciones" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
composer install --optimize-autoloader

Write-Host ""
Write-Host "⚙️ Configurando archivo .env..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Archivo .env creado desde .env.example" -ForegroundColor Green
    } else {
        # Crear .env básico
        $envContent = @"
APP_ENV=dev
APP_SECRET=your-secret-key-here
DATABASE_URL=mysql://root:@localhost:3306/errekalde_car_wash?serverVersion=8.0.32&charset=utf8mb4
MERCURE_URL=https://127.0.0.1:3000/.well-known/mercure
MERCURE_PUBLIC_URL=https://127.0.0.1:3000/.well-known/mercure
MERCURE_JWT_SECRET=!ChangeThisMercureHubJWTSecretKey!
CAR_WASH_DEFAULT_SPACES=8
CAR_WASH_WEEKS_AHEAD=12
CAR_WASH_ONLY_WEDNESDAYS=true
FRONTEND_URL=http://localhost:8000
CORS_ALLOW_ORIGIN=http://localhost:8000
N8N_WEBHOOK_URL=https://n8nserver.swapenergia.com/webhook/errekaldecarwash
N8N_VALIDATION_URL=https://n8nserver.swapenergia.com/webhook/validarNumero
"@
        $envContent | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "✅ Archivo .env básico creado" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️ Archivo .env ya existe" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🗄️ Configurando base de datos..." -ForegroundColor Yellow
try {
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS errekalde_car_wash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    Write-Host "✅ Base de datos creada/verificada" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Error al crear base de datos - verificar configuración MySQL" -ForegroundColor Yellow
    Write-Host "   Comando manual: mysql -u root -e `"CREATE DATABASE errekalde_car_wash;`"" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔄 Ejecutando migraciones..." -ForegroundColor Yellow
try {
    php bin/console doctrine:migrations:migrate --no-interaction
    Write-Host "✅ Migraciones ejecutadas" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en migraciones - verificar conexión a BD" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Inicializando sistema..." -ForegroundColor Yellow
try {
    php bin/console car-wash:initialize --weeks=12 --spaces=8
    Write-Host "✅ Sistema inicializado con 12 miércoles y 8 espacios" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al inicializar sistema" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 Creando script de inicio..." -ForegroundColor Yellow
$startScript = @"
Write-Host "🚗 Iniciando Errekalde Car Wash..." -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

if (Get-Command "symfony" -ErrorAction SilentlyContinue) {
    Write-Host "🌐 Usando Symfony CLI..." -ForegroundColor Green
    symfony server:start --port=8000
} else {
    Write-Host "🌐 Usando servidor PHP integrado..." -ForegroundColor Green
    Write-Host "   Presiona Ctrl+C para detener" -ForegroundColor Yellow
    Write-Host ""
    php -S localhost:8000 -t public/
}
"@
$startScript | Out-File -FilePath "start.ps1" -Encoding UTF8
Write-Host "✅ Script de inicio creado: start.ps1" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 INSTALACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Para iniciar el sistema:" -ForegroundColor Cyan
Write-Host "   .\start.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 URLs disponibles:" -ForegroundColor Cyan
Write-Host "   • Frontend: http://localhost:8000" -ForegroundColor White
Write-Host "   • API: http://localhost:8000/api" -ForegroundColor White
Write-Host "   • Health Check: http://localhost:8000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   • Resetear espacios: php bin/console car-wash:initialize --reset" -ForegroundColor White
Write-Host "   • Limpiar cache: php bin/console cache:clear" -ForegroundColor White
Write-Host "   • Ver logs: Get-Content var/log/dev.log -Wait" -ForegroundColor White
Write-Host ""
Write-Host "✅ Sistema listo para usar!" -ForegroundColor Green 