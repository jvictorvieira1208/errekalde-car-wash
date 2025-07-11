# Script de Instalación Automatizada para Windows
# Errekalde Car Wash - Symfony Edition
# Sistema de reservas con sincronización en tiempo real

$ErrorActionPreference = "Stop"

Write-Host "🚗 ===========================================" -ForegroundColor Cyan
Write-Host "   ERREKALDE CAR WASH - INSTALACIÓN" -ForegroundColor Yellow
Write-Host "   Symfony 6.4 + MariaDB + Mercure" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Funciones de utilidad
function Log-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Log-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Log-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Verificar requisitos del sistema
function Test-Requirements {
    Log-Info "Verificando requisitos del sistema..."
    
    $missingRequirements = @()
    
    # Verificar PHP
    if (-not (Test-Command "php")) {
        $missingRequirements += "PHP 8.3+"
    } else {
        $phpVersion = php -r "echo PHP_VERSION;"
        Log-Success "PHP encontrado: $phpVersion"
    }
    
    # Verificar Composer
    if (-not (Test-Command "composer")) {
        $missingRequirements += "Composer"
    } else {
        $composerVersion = (composer --version).Split(' ')[2]
        Log-Success "Composer encontrado: $composerVersion"
    }
    
    # Verificar MySQL/MariaDB
    if (-not (Test-Command "mysql")) {
        $missingRequirements += "MySQL/MariaDB"
    } else {
        Log-Success "MySQL/MariaDB encontrado"
    }
    
    if ($missingRequirements.Count -gt 0) {
        Log-Error "Faltan los siguientes requisitos:"
        foreach ($req in $missingRequirements) {
            Write-Host "  - $req" -ForegroundColor Red
        }
        Write-Host ""
        Log-Info "Por favor, instala los requisitos faltantes y ejecuta el script nuevamente."
        exit 1
    }
    
    Log-Success "Todos los requisitos están satisfechos"
}

# Instalar dependencias PHP
function Install-PhpDependencies {
    Log-Info "Instalando dependencias PHP..."
    
    if (Test-Path "composer.json") {
        composer install --optimize-autoloader
        Log-Success "Dependencias PHP instaladas"
    } else {
        Log-Error "No se encontró composer.json"
        exit 1
    }
}

# Configurar archivo .env
function Setup-Environment {
    Log-Info "Configurando archivo de entorno..."
    
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Log-Success "Archivo .env creado desde .env.example"
        } else {
            Log-Warning "No se encontró .env.example, creando .env básico..."
            $envContent = @"
APP_ENV=dev
APP_SECRET=$([System.Web.Security.Membership]::GeneratePassword(64, 10))
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
N8N_VALIDATION_URL=https://n8nserver.swapenergia.com/webhook/validarNúmero
"@
            $envContent | Out-File -FilePath ".env" -Encoding UTF8
            Log-Success "Archivo .env básico creado"
        }
    } else {
        Log-Warning "Archivo .env ya existe, saltando..."
    }
}

# Configurar base de datos
function Setup-Database {
    Log-Info "Configurando base de datos..."
    
    try {
        Log-Info "Creando base de datos errekalde_car_wash..."
        mysql -u root -e "CREATE DATABASE IF NOT EXISTS errekalde_car_wash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        Log-Success "Base de datos configurada"
    } catch {
        Log-Warning "No se pudo crear la base de datos automáticamente."
        Log-Info "Por favor, crea la base de datos manualmente:"
        Write-Host "  mysql -u root -p" -ForegroundColor Yellow
        Write-Host "  CREATE DATABASE errekalde_car_wash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor Yellow
        $response = Read-Host "¿Has creado la base de datos? (y/n)"
        if ($response -notmatch '^[Yy]$') {
            Log-Error "Base de datos requerida para continuar"
            exit 1
        }
    }
}

# Ejecutar migraciones
function Invoke-Migrations {
    Log-Info "Ejecutando migraciones de base de datos..."
    
    php bin/console doctrine:migrations:migrate --no-interaction
    Log-Success "Migraciones ejecutadas correctamente"
    
    # Verificar que las tablas se crearon
    php bin/console doctrine:schema:validate
    Log-Success "Esquema de base de datos validado"
}

# Descargar e instalar Mercure
function Install-Mercure {
    Log-Info "Instalando Mercure Hub..."
    
    if (-not (Test-Path "mercure.exe")) {
        Log-Info "Descargando Mercure para Windows..."
        $mercureUrl = "https://github.com/dunglas/mercure/releases/latest/download/mercure_windows_amd64.zip"
        
        try {
            Invoke-WebRequest -Uri $mercureUrl -OutFile "mercure.zip"
            Expand-Archive -Path "mercure.zip" -DestinationPath "." -Force
            Remove-Item "mercure.zip"
            Log-Success "Mercure descargado e instalado"
        } catch {
            Log-Warning "No se pudo descargar Mercure automáticamente"
            Log-Info "Por favor, descarga Mercure manualmente desde: https://github.com/dunglas/mercure/releases"
        }
    } else {
        Log-Warning "Mercure ya está instalado"
    }
    
    # Crear archivo de configuración Mercure
    if (-not (Test-Path "Caddyfile")) {
        Log-Info "Creando configuración de Mercure..."
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
        Log-Success "Configuración de Mercure creada"
    }
}

# Inicializar sistema
function Initialize-System {
    Log-Info "Inicializando sistema con espacios por defecto..."
    
    php bin/console car-wash:initialize --weeks=12 --spaces=8
    Log-Success "Sistema inicializado con 12 miércoles y 8 espacios cada uno"
}

# Crear scripts de inicio
function New-StartupScripts {
    Log-Info "Creando scripts de inicio..."
    
    # Script para iniciar todo el sistema
    $startSystemContent = @"
# Script para iniciar el sistema completo
Write-Host "🚗 Iniciando Sistema Errekalde Car Wash..." -ForegroundColor Cyan

# Verificar que Mercure existe
if (-not (Test-Path "mercure.exe")) {
    Write-Host "❌ Mercure no encontrado. Ejecuta ./install.ps1 primero." -ForegroundColor Red
    exit 1
}

# Iniciar Mercure en background
Write-Host "📡 Iniciando Mercure Hub..." -ForegroundColor Yellow
Start-Process -FilePath "./mercure.exe" -ArgumentList "run", "--config", "Caddyfile" -WindowStyle Hidden

# Esperar un poco para que Mercure inicie
Start-Sleep -Seconds 3

# Iniciar Symfony
Write-Host "🌐 Iniciando servidor Symfony..." -ForegroundColor Green
if (Get-Command "symfony" -ErrorAction SilentlyContinue) {
    symfony server:start --port=8000
} else {
    php -S localhost:8000 -t public/
}
"@
    $startSystemContent | Out-File -FilePath "start-system.ps1" -Encoding UTF8
    
    # Script para solo Mercure
    $startMercureContent = @"
Write-Host "📡 Iniciando solo Mercure Hub..." -ForegroundColor Yellow
./mercure.exe run --config Caddyfile
"@
    $startMercureContent | Out-File -FilePath "start-mercure.ps1" -Encoding UTF8
    
    # Script para solo Symfony
    $startSymfonyContent = @"
Write-Host "🌐 Iniciando solo servidor Symfony..." -ForegroundColor Green
if (Get-Command "symfony" -ErrorAction SilentlyContinue) {
    symfony server:start --port=8000
} else {
    php -S localhost:8000 -t public/
}
"@
    $startSymfonyContent | Out-File -FilePath "start-symfony.ps1" -Encoding UTF8
    
    Log-Success "Scripts de inicio creados"
}

# Verificar instalación
function Test-Installation {
    Log-Info "Verificando instalación..."
    
    # Verificar que las tablas existen
    try {
        $tableCount = (mysql -u root errekalde_car_wash -e "SHOW TABLES;" | Measure-Object -Line).Lines
        if ($tableCount -gt 1) {
            Log-Success "Tablas de base de datos creadas correctamente"
        } else {
            Log-Error "Las tablas de base de datos no se crearon"
            exit 1
        }
    } catch {
        Log-Warning "No se pudo verificar las tablas de base de datos"
    }
    
    # Verificar que Mercure existe
    if (Test-Path "mercure.exe") {
        Log-Success "Mercure instalado correctamente"
    } else {
        Log-Warning "Mercure no encontrado"
    }
    
    # Verificar permisos
    if (Test-Path "var/") {
        Log-Success "Directorio var/ existe"
    } else {
        Log-Warning "Verifica el directorio var/"
    }
}

# Mostrar información final
function Show-FinalInfo {
    Write-Host ""
    Write-Host "🎉 ===========================================" -ForegroundColor Green
    Write-Host "   INSTALACIÓN COMPLETADA EXITOSAMENTE" -ForegroundColor Yellow
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host ""
    Log-Success "¡El sistema está listo para usar!"
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "  1. Iniciar el sistema completo:" -ForegroundColor White
    Write-Host "     ./start-system.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  2. O iniciar componentes por separado:" -ForegroundColor White
    Write-Host "     ./start-mercure.ps1   (Terminal 1)" -ForegroundColor Yellow
    Write-Host "     ./start-symfony.ps1   (Terminal 2)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🌐 URLs del sistema:" -ForegroundColor Cyan
    Write-Host "  • Frontend: http://localhost:8000" -ForegroundColor White
    Write-Host "  • API: http://localhost:8000/api" -ForegroundColor White
    Write-Host "  • Health Check: http://localhost:8000/api/health" -ForegroundColor White
    Write-Host "  • Admin: http://localhost:8000/admin" -ForegroundColor White
    Write-Host "  • Mercure Hub: http://localhost:3000/.well-known/mercure" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Comandos útiles:" -ForegroundColor Cyan
    Write-Host "  • Resetear espacios: php bin/console car-wash:initialize --reset" -ForegroundColor White
    Write-Host "  • Ver logs: Get-Content var/log/dev.log -Wait" -ForegroundColor White
    Write-Host "  • Limpiar cache: php bin/console cache:clear" -ForegroundColor White
    Write-Host ""
    Log-Success "¡Disfruta del sistema de sincronización en tiempo real!"
}

# Función principal
function Main {
    Log-Info "Iniciando instalación automatizada..."
    Write-Host ""
    
    Test-Requirements
    Write-Host ""
    
    Install-PhpDependencies
    Write-Host ""
    
    Setup-Environment
    Write-Host ""
    
    Setup-Database
    Write-Host ""
    
    Invoke-Migrations
    Write-Host ""
    
    Install-Mercure
    Write-Host ""
    
    Initialize-System
    Write-Host ""
    
    New-StartupScripts
    Write-Host ""
    
    Test-Installation
    Write-Host ""
    
    Show-FinalInfo
}

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "composer.json")) {
    Log-Error "Este script debe ejecutarse desde el directorio raíz del proyecto Symfony"
    Log-Info "Asegúrate de estar en el directorio que contiene composer.json"
    exit 1
}

# Ejecutar instalación
Main 