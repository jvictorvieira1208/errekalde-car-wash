#!/bin/bash

# Script de Instalación Automatizada
# Errekalde Car Wash - Symfony Edition
# Sistema de reservas con sincronización en tiempo real

set -e

echo "🚗 =========================================="
echo "   ERREKALDE CAR WASH - INSTALACIÓN"
echo "   Symfony 6.4 + MariaDB + Mercure"
echo "=========================================="
echo

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de utilidad
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si el comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detectar sistema operativo
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

# Verificar requisitos del sistema
check_requirements() {
    log_info "Verificando requisitos del sistema..."
    
    local missing_requirements=()
    
    # Verificar PHP
    if ! command_exists php; then
        missing_requirements+=("PHP 8.3+")
    else
        local php_version=$(php -r "echo PHP_VERSION;")
        log_success "PHP encontrado: $php_version"
    fi
    
    # Verificar Composer
    if ! command_exists composer; then
        missing_requirements+=("Composer")
    else
        local composer_version=$(composer --version | cut -d' ' -f3)
        log_success "Composer encontrado: $composer_version"
    fi
    
    # Verificar MySQL/MariaDB
    if ! command_exists mysql; then
        missing_requirements+=("MySQL/MariaDB")
    else
        log_success "MySQL/MariaDB encontrado"
    fi
    
    # Verificar curl
    if ! command_exists curl; then
        missing_requirements+=("curl")
    fi
    
    if [ ${#missing_requirements[@]} -ne 0 ]; then
        log_error "Faltan los siguientes requisitos:"
        for req in "${missing_requirements[@]}"; do
            echo "  - $req"
        done
        echo
        log_info "Por favor, instala los requisitos faltantes y ejecuta el script nuevamente."
        exit 1
    fi
    
    log_success "Todos los requisitos están satisfechos"
}

# Instalar dependencias PHP
install_php_dependencies() {
    log_info "Instalando dependencias PHP..."
    
    if [ -f "composer.json" ]; then
        composer install --optimize-autoloader
        log_success "Dependencias PHP instaladas"
    else
        log_error "No se encontró composer.json"
        exit 1
    fi
}

# Configurar archivo .env
setup_environment() {
    log_info "Configurando archivo de entorno..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success "Archivo .env creado desde .env.example"
        else
            log_warning "No se encontró .env.example, creando .env básico..."
            cat > .env << EOF
APP_ENV=dev
APP_SECRET=$(openssl rand -hex 32)
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
EOF
            log_success "Archivo .env básico creado"
        fi
    else
        log_warning "Archivo .env ya existe, saltando..."
    fi
}

# Configurar base de datos
setup_database() {
    log_info "Configurando base de datos..."
    
    # Intentar crear la base de datos
    log_info "Creando base de datos errekalde_car_wash..."
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS errekalde_car_wash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || {
        log_warning "No se pudo crear la base de datos automáticamente."
        log_info "Por favor, crea la base de datos manualmente:"
        echo "  mysql -u root -p"
        echo "  CREATE DATABASE errekalde_car_wash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        read -p "¿Has creado la base de datos? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Base de datos requerida para continuar"
            exit 1
        fi
    }
    
    log_success "Base de datos configurada"
}

# Ejecutar migraciones
run_migrations() {
    log_info "Ejecutando migraciones de base de datos..."
    
    php bin/console doctrine:migrations:migrate --no-interaction
    log_success "Migraciones ejecutadas correctamente"
    
    # Verificar que las tablas se crearon
    php bin/console doctrine:schema:validate
    log_success "Esquema de base de datos validado"
}

# Descargar e instalar Mercure
install_mercure() {
    log_info "Instalando Mercure Hub..."
    
    local os=$(detect_os)
    local mercure_url=""
    
    case $os in
        "linux")
            mercure_url="https://github.com/dunglas/mercure/releases/latest/download/mercure_linux_amd64.tar.gz"
            ;;
        "macos")
            mercure_url="https://github.com/dunglas/mercure/releases/latest/download/mercure_darwin_amd64.tar.gz"
            ;;
        *)
            log_warning "Sistema operativo no soportado para instalación automática de Mercure"
            log_info "Por favor, descarga Mercure manualmente desde: https://github.com/dunglas/mercure/releases"
            return
            ;;
    esac
    
    if [ ! -f "mercure" ]; then
        log_info "Descargando Mercure..."
        curl -LO "$mercure_url"
        tar -xzf mercure_*.tar.gz
        chmod +x mercure
        rm mercure_*.tar.gz
        log_success "Mercure descargado e instalado"
    else
        log_warning "Mercure ya está instalado"
    fi
    
    # Crear archivo de configuración Mercure
    if [ ! -f "Caddyfile" ]; then
        log_info "Creando configuración de Mercure..."
        cat > Caddyfile << EOF
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
EOF
        log_success "Configuración de Mercure creada"
    fi
}

# Inicializar sistema
initialize_system() {
    log_info "Inicializando sistema con espacios por defecto..."
    
    php bin/console car-wash:initialize --weeks=12 --spaces=8
    log_success "Sistema inicializado con 12 miércoles y 8 espacios cada uno"
}

# Crear scripts de inicio
create_startup_scripts() {
    log_info "Creando scripts de inicio..."
    
    # Script para iniciar todo el sistema
    cat > start-system.sh << 'EOF'
#!/bin/bash

echo "🚗 Iniciando Sistema Errekalde Car Wash..."

# Verificar que Mercure existe
if [ ! -f "mercure" ]; then
    echo "❌ Mercure no encontrado. Ejecuta ./install.sh primero."
    exit 1
fi

# Iniciar Mercure en background
echo "📡 Iniciando Mercure Hub..."
./mercure run --config Caddyfile &
MERCURE_PID=$!
echo "Mercure PID: $MERCURE_PID"

# Esperar un poco para que Mercure inicie
sleep 2

# Iniciar Symfony
echo "🌐 Iniciando servidor Symfony..."
if command -v symfony >/dev/null 2>&1; then
    symfony server:start --port=8000
else
    php -S localhost:8000 -t public/
fi

# Cleanup: matar Mercure cuando se termine Symfony
kill $MERCURE_PID 2>/dev/null
EOF

    chmod +x start-system.sh
    
    # Script para solo Mercure
    cat > start-mercure.sh << 'EOF'
#!/bin/bash
echo "📡 Iniciando solo Mercure Hub..."
./mercure run --config Caddyfile
EOF

    chmod +x start-mercure.sh
    
    # Script para solo Symfony
    cat > start-symfony.sh << 'EOF'
#!/bin/bash
echo "🌐 Iniciando solo servidor Symfony..."
if command -v symfony >/dev/null 2>&1; then
    symfony server:start --port=8000
else
    php -S localhost:8000 -t public/
fi
EOF

    chmod +x start-symfony.sh
    
    log_success "Scripts de inicio creados"
}

# Verificar instalación
verify_installation() {
    log_info "Verificando instalación..."
    
    # Verificar que las tablas existen
    local table_count=$(mysql -u root errekalde_car_wash -e "SHOW TABLES;" | wc -l)
    if [ $table_count -gt 1 ]; then
        log_success "Tablas de base de datos creadas correctamente"
    else
        log_error "Las tablas de base de datos no se crearon"
        exit 1
    fi
    
    # Verificar que Mercure existe
    if [ -f "mercure" ]; then
        log_success "Mercure instalado correctamente"
    else
        log_warning "Mercure no encontrado"
    fi
    
    # Verificar permisos
    if [ -w "var/" ]; then
        log_success "Permisos de directorio var/ correctos"
    else
        log_warning "Verifica permisos del directorio var/"
    fi
}

# Mostrar información final
show_final_info() {
    echo
    echo "🎉 =========================================="
    echo "   INSTALACIÓN COMPLETADA EXITOSAMENTE"
    echo "=========================================="
    echo
    log_success "El sistema está listo para usar!"
    echo
    echo "📋 Próximos pasos:"
    echo "  1. Iniciar el sistema completo:"
    echo "     ./start-system.sh"
    echo
    echo "  2. O iniciar componentes por separado:"
    echo "     ./start-mercure.sh   (Terminal 1)"
    echo "     ./start-symfony.sh   (Terminal 2)"
    echo
    echo "🌐 URLs del sistema:"
    echo "  • Frontend: http://localhost:8000"
    echo "  • API: http://localhost:8000/api"
    echo "  • Health Check: http://localhost:8000/api/health"
    echo "  • Admin: http://localhost:8000/admin"
    echo "  • Mercure Hub: http://localhost:3000/.well-known/mercure"
    echo
    echo "🔧 Comandos útiles:"
    echo "  • Resetear espacios: php bin/console car-wash:initialize --reset"
    echo "  • Ver logs: tail -f var/log/dev.log"
    echo "  • Limpiar cache: php bin/console cache:clear"
    echo
    echo "📞 Para conectar con la URL pública:"
    echo "  1. Edita .env y cambia FRONTEND_URL y CORS_ALLOW_ORIGIN"
    echo "  2. Configura tu servidor web para exponer la aplicación"
    echo "  3. Actualiza el frontend público para apuntar a tu API"
    echo
    log_success "¡Disfruta del sistema de sincronización en tiempo real!"
}

# Función principal
main() {
    log_info "Iniciando instalación automatizada..."
    echo
    
    check_requirements
    echo
    
    install_php_dependencies
    echo
    
    setup_environment
    echo
    
    setup_database
    echo
    
    run_migrations
    echo
    
    install_mercure
    echo
    
    initialize_system
    echo
    
    create_startup_scripts
    echo
    
    verify_installation
    echo
    
    show_final_info
}

# Verificar que estamos en el directorio correcto
if [ ! -f "composer.json" ]; then
    log_error "Este script debe ejecutarse desde el directorio raíz del proyecto Symfony"
    log_info "Asegúrate de estar en el directorio que contiene composer.json"
    exit 1
fi

# Ejecutar instalación
main "$@" 