# Script de Instalación Completa - Errekalde Car Wash
# Instala prerrequisitos y sistema completo

Write-Host "CAR WASH - INSTALACION COMPLETA" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Green
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

# Verificar e instalar PHP
Write-Host "Verificando PHP..." -ForegroundColor Yellow
if (-not (Test-Command "php")) {
    Write-Host "Instalando PHP..." -ForegroundColor Yellow
    $phpUrl = "https://windows.php.net/downloads/releases/php-8.3.14-Win32-vs16-x64.zip"
    $phpDir = "C:\php"
    
    # Crear directorio PHP
    if (-not (Test-Path $phpDir)) {
        New-Item -ItemType Directory -Path $phpDir
    }
    
    # Descargar PHP
    Write-Host "Descargando PHP..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $phpUrl -OutFile "$env:TEMP\php.zip"
    
    # Extraer PHP
    Write-Host "Extrayendo PHP..." -ForegroundColor Yellow
    Expand-Archive -Path "$env:TEMP\php.zip" -DestinationPath $phpDir -Force
    
    # Agregar PHP al PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($currentPath -notlike "*$phpDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$phpDir", "Machine")
    }
    
    # Actualizar PATH en sesión actual
    $env:Path += ";$phpDir"
    
    # Crear php.ini básico
    Copy-Item "$phpDir\php.ini-development" "$phpDir\php.ini"
    
    # Habilitar extensiones necesarias
    $phpIni = Get-Content "$phpDir\php.ini"
    $phpIni = $phpIni -replace ";extension=pdo_mysql", "extension=pdo_mysql"
    $phpIni = $phpIni -replace ";extension=mysqli", "extension=mysqli"
    $phpIni = $phpIni -replace ";extension=curl", "extension=curl"
    $phpIni = $phpIni -replace ";extension=openssl", "extension=openssl"
    $phpIni = $phpIni -replace ";extension=mbstring", "extension=mbstring"
    $phpIni | Set-Content "$phpDir\php.ini"
    
    Remove-Item "$env:TEMP\php.zip"
    Write-Host "PHP instalado correctamente" -ForegroundColor Green
} else {
    Write-Host "PHP ya esta instalado" -ForegroundColor Green
}

# Verificar e instalar Composer
Write-Host "Verificando Composer..." -ForegroundColor Yellow
if (-not (Test-Command "composer")) {
    Write-Host "Instalando Composer..." -ForegroundColor Yellow
    $composerUrl = "https://getcomposer.org/download/latest-stable/composer.phar"
    $composerDir = "C:\composer"
    
    # Crear directorio Composer
    if (-not (Test-Path $composerDir)) {
        New-Item -ItemType Directory -Path $composerDir
    }
    
    # Descargar Composer
    Invoke-WebRequest -Uri $composerUrl -OutFile "$composerDir\composer.phar"
    
    # Crear batch para ejecutar composer
    $composerBat = @"
@echo off
php "C:\composer\composer.phar" %*
"@
    $composerBat | Out-File -FilePath "$composerDir\composer.bat" -Encoding ASCII
    
    # Agregar Composer al PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($currentPath -notlike "*$composerDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$composerDir", "Machine")
    }
    
    # Actualizar PATH en sesión actual
    $env:Path += ";$composerDir"
    
    Write-Host "Composer instalado correctamente" -ForegroundColor Green
} else {
    Write-Host "Composer ya esta instalado" -ForegroundColor Green
}

# Verificar e instalar MySQL
Write-Host "Verificando MySQL..." -ForegroundColor Yellow
if (-not (Test-Command "mysql")) {
    Write-Host "Instalando MySQL..." -ForegroundColor Yellow
    $mysqlUrl = "https://dev.mysql.com/get/Downloads/MySQLInstaller/mysql-installer-community-8.0.40.0.msi"
    
    # Descargar MySQL Installer
    Write-Host "Descargando MySQL Installer..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $mysqlUrl -OutFile "$env:TEMP\mysql-installer.msi"
    
    # Ejecutar instalador
    Write-Host "Ejecutando instalador MySQL..." -ForegroundColor Yellow
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", "$env:TEMP\mysql-installer.msi", "/quiet" -Wait
    
    # Agregar MySQL al PATH
    $mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin"
    if (Test-Path $mysqlPath) {
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        if ($currentPath -notlike "*$mysqlPath*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$mysqlPath", "Machine")
        }
        $env:Path += ";$mysqlPath"
    }
    
    Remove-Item "$env:TEMP\mysql-installer.msi"
    Write-Host "MySQL instalado (puede requerir configuración manual)" -ForegroundColor Green
} else {
    Write-Host "MySQL ya esta instalado" -ForegroundColor Green
}

# Esperar a que las herramientas estén disponibles
Write-Host "Esperando a que las herramientas estén disponibles..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar instalaciones
Write-Host "Verificando instalaciones..." -ForegroundColor Yellow
if (Test-Command "php") {
    $phpVersion = php -r "echo PHP_VERSION;"
    Write-Host "PHP: $phpVersion" -ForegroundColor Green
} else {
    Write-Host "PHP no disponible - reinicia PowerShell" -ForegroundColor Red
    exit 1
}

if (Test-Command "composer") {
    Write-Host "Composer: OK" -ForegroundColor Green
} else {
    Write-Host "Composer no disponible - reinicia PowerShell" -ForegroundColor Red
    exit 1
}

# Instalar dependencias del proyecto
Write-Host "Instalando dependencias del proyecto..." -ForegroundColor Yellow
composer install --optimize-autoloader

# Crear archivo .env
Write-Host "Creando archivo .env..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    $envContent = "APP_ENV=dev`nAPP_SECRET=your-secret-key-here`nDATABASE_URL=mysql://root:@localhost:3306/errekalde_car_wash?serverVersion=8.0.32&charset=utf8mb4`nMERCURE_URL=https://127.0.0.1:3000/.well-known/mercure`nMERCURE_PUBLIC_URL=https://127.0.0.1:3000/.well-known/mercure`nMERCURE_JWT_SECRET=!ChangeThisMercureHubJWTSecretKey!`nCAR_WASH_DEFAULT_SPACES=8`nCAR_WASH_WEEKS_AHEAD=12`nCAR_WASH_ONLY_WEDNESDAYS=true`nFRONTEND_URL=http://localhost:8000`nCORS_ALLOW_ORIGIN=http://localhost:8000`nN8N_WEBHOOK_URL=https://n8nserver.swapenergia.com/webhook/errekaldecarwash`nN8N_VALIDATION_URL=https://n8nserver.swapenergia.com/webhook/validarNumero"
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "Archivo .env creado" -ForegroundColor Green
}

# Crear script de inicio simple
Write-Host "Creando script de inicio..." -ForegroundColor Yellow
$startScript = @"
Write-Host "Iniciando Symfony..." -ForegroundColor Green
if (Get-Command "symfony" -ErrorAction SilentlyContinue) {
    symfony server:start --port=8000
} else {
    php -S localhost:8000 -t public/
}
"@
$startScript | Out-File -FilePath "start.ps1" -Encoding UTF8

# Información final
Write-Host ""
Write-Host "INSTALACION COMPLETADA" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host ""
Write-Host "NOTAS IMPORTANTES:" -ForegroundColor Yellow
Write-Host "1. Reinicia PowerShell para que los PATHs se actualicen" -ForegroundColor White
Write-Host "2. Configura MySQL con usuario root sin password" -ForegroundColor White
Write-Host "3. Crea la base de datos: mysql -u root -e 'CREATE DATABASE errekalde_car_wash;'" -ForegroundColor White
Write-Host "4. Ejecuta las migraciones: php bin/console doctrine:migrations:migrate" -ForegroundColor White
Write-Host "5. Inicializa el sistema: php bin/console car-wash:initialize" -ForegroundColor White
Write-Host "6. Inicia el servidor: .\start.ps1" -ForegroundColor White
Write-Host ""
Write-Host "URL: http://localhost:8000" -ForegroundColor Green 