# 🚗 Instalación Sistema Errekalde Car Wash - Symfony Edition

## 📋 Requisitos del Sistema

### Software Requerido
- **PHP 8.3+** con extensiones:
  - `php-fpm`
  - `php-mysql`
  - `php-json`
  - `php-mbstring`
  - `php-xml`
  - `php-curl`
  - `php-intl`
- **MariaDB 11.8+** o **MySQL 8.0+**
- **Composer 2.0+**
- **Node.js 18+** (para Mercure Hub)
- **Servidor Web** (Apache/Nginx)

### Puertos Requeridos
- **80/443**: Servidor web principal
- **3000**: Mercure Hub (WebSockets)
- **3306**: MariaDB/MySQL

## 🚀 Instalación Paso a Paso

### 1. Preparar el Entorno

```bash
# Clonar el proyecto
git clone [URL_DEL_REPO] errekalde-car-wash-symfony
cd errekalde-car-wash-symfony

# Instalar dependencias PHP
composer install

# Copiar archivo de configuración
cp .env.example .env
```

### 2. Configurar Base de Datos

#### A. Instalar MariaDB
```bash
# En Ubuntu/Debian
sudo apt update
sudo apt install mariadb-server

# En Windows
# Descargar desde: https://mariadb.org/download/
```

#### B. Crear Base de Datos
```sql
-- Conectar a MariaDB
mysql -u root -p

-- Crear base de datos
CREATE DATABASE errekalde_car_wash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario (opcional)
CREATE USER 'carwash'@'localhost' IDENTIFIED BY 'password_seguro';
GRANT ALL PRIVILEGES ON errekalde_car_wash.* TO 'carwash'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### C. Configurar .env
```bash
# Editar archivo .env
nano .env

# Configurar DATABASE_URL
DATABASE_URL="mysql://root:@localhost:3306/errekalde_car_wash?serverVersion=mariadb-11.8.0&charset=utf8mb4"

# O con usuario personalizado:
# DATABASE_URL="mysql://carwash:password_seguro@localhost:3306/errekalde_car_wash?serverVersion=mariadb-11.8.0&charset=utf8mb4"
```

### 3. Ejecutar Migraciones

```bash
# Crear las tablas en la base de datos
php bin/console doctrine:migrations:migrate --no-interaction

# Verificar que las tablas se crearon
php bin/console doctrine:schema:validate
```

### 4. Instalar Mercure Hub

#### A. Descargar Mercure
```bash
# Linux/macOS
curl -LO https://github.com/dunglas/mercure/releases/latest/download/mercure_linux_amd64.tar.gz
tar -xzf mercure_linux_amd64.tar.gz

# Windows
# Descargar desde: https://github.com/dunglas/mercure/releases/latest
```

#### B. Configurar Mercure
```bash
# Crear archivo de configuración Mercure
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
```

### 5. Inicializar Sistema

```bash
# Inicializar espacios para miércoles
php bin/console car-wash:initialize --weeks=12 --spaces=8

# Verificar que todo funciona
php bin/console car-wash:initialize --reset --weeks=12 --spaces=8
```

### 6. Configurar Servidor Web

#### Opción A: Servidor de Desarrollo (Recomendado para testing)
```bash
# Terminal 1: Iniciar Mercure
./mercure run --config Caddyfile

# Terminal 2: Iniciar Symfony
symfony server:start --port=8000

# O con PHP built-in server
php -S localhost:8000 -t public/
```

#### Opción B: Apache (Producción)
```apache
<VirtualHost *:80>
    ServerName errekalde-car-wash.local
    DocumentRoot /path/to/symfony-car-wash/public
    
    <Directory /path/to/symfony-car-wash/public>
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/carwash_error.log
    CustomLog ${APACHE_LOG_DIR}/carwash_access.log combined
</VirtualHost>
```

#### Opción C: Nginx (Producción)
```nginx
server {
    listen 80;
    server_name errekalde-car-wash.local;
    root /path/to/symfony-car-wash/public;
    
    location / {
        try_files $uri /index.php$is_args$args;
    }
    
    location ~ ^/index\.php(/|$) {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;
    }
    
    location ~ \.php$ {
        return 404;
    }
}
```

### 7. Configurar Conexión con URL Pública

Para conectar con `https://errekalde-car-wash.surge.sh/`:

#### A. Actualizar .env
```bash
# Configurar CORS
FRONTEND_URL=https://errekalde-car-wash.surge.sh
CORS_ALLOW_ORIGIN=https://errekalde-car-wash.surge.sh
```

#### B. Configurar Frontend Público

Actualizar el frontend público para apuntar a tu servidor Symfony:

```javascript
// En el frontend público, cambiar la configuración API
window.APP_CONFIG = {
    apiBaseUrl: 'https://TU-SERVIDOR.com/api',  // Cambiar esta URL
    mercureConfig: {
        mercure_url: 'https://TU-SERVIDOR.com:3000/.well-known/mercure'
    }
};
```

## 🧪 Verificación de la Instalación

### 1. Probar Conexión a Base de Datos
```bash
php bin/console doctrine:query:sql "SELECT COUNT(*) as total FROM available_spaces"
```

### 2. Probar API
```bash
# Health check
curl http://localhost:8000/api/health

# Obtener espacios
curl http://localhost:8000/api/espacios

# Probar CORS (desde el frontend público)
curl -X OPTIONS http://localhost:8000/api/reservar \
  -H "Origin: https://errekalde-car-wash.surge.sh" \
  -H "Access-Control-Request-Method: POST"
```

### 3. Probar WebSockets
```bash
# Verificar que Mercure está funcionando
curl http://localhost:3000/.well-known/mercure
```

### 4. Probar Frontend
```bash
# Abrir en navegador
open http://localhost:8000

# Verificar que los espacios se cargan
# Verificar que la sincronización funciona (abrir en múltiples pestañas)
```

## 🔧 Configuración de Producción

### 1. Variables de Entorno
```bash
# .env.prod
APP_ENV=prod
APP_DEBUG=false
DATABASE_URL="mysql://user:password@localhost:3306/errekalde_car_wash"
MERCURE_URL=https://tu-dominio.com:3000/.well-known/mercure
MERCURE_PUBLIC_URL=https://tu-dominio.com:3000/.well-known/mercure
```

### 2. Optimizaciones
```bash
# Limpiar caché
php bin/console cache:clear --env=prod

# Generar autoloader optimizado
composer install --no-dev --optimize-autoloader

# Precompilar assets (si usas Webpack Encore)
npm run build
```

### 3. Configurar HTTPS
```bash
# Con Certbot (Let's Encrypt)
sudo certbot --apache -d tu-dominio.com
```

## 🐛 Troubleshooting

### Problema: Error de Conexión a Base de Datos
```bash
# Verificar que MariaDB está ejecutándose
sudo systemctl status mariadb

# Verificar conexión
mysql -u root -p -e "SHOW DATABASES;"

# Verificar permisos
php bin/console doctrine:database:create --if-not-exists
```

### Problema: Mercure No Conecta
```bash
# Verificar que el puerto 3000 está libre
netstat -tlnp | grep :3000

# Verificar configuración JWT
php bin/console debug:config mercure
```

### Problema: CORS Errors
```bash
# Verificar configuración en services.yaml
php bin/console debug:config framework cors

# Verificar headers en respuesta
curl -I http://localhost:8000/api/health
```

### Problema: Permisos de Archivos
```bash
# Configurar permisos correctos
sudo chown -R www-data:www-data /path/to/symfony-car-wash
sudo chmod -R 755 /path/to/symfony-car-wash
sudo chmod -R 775 /path/to/symfony-car-wash/var
```

## 📊 Monitoreo del Sistema

### Logs de Aplicación
```bash
# Ver logs en tiempo real
tail -f var/log/prod.log

# Ver logs de errores
tail -f var/log/dev.log | grep ERROR
```

### Logs de Base de Datos
```bash
# Ver queries lentas
sudo tail -f /var/log/mysql/mysql-slow.log
```

### Monitorear WebSockets
```bash
# Ver conexiones activas a Mercure
netstat -an | grep :3000
```

## 🎯 URLs Finales

Una vez instalado correctamente:

- **Frontend**: http://localhost:8000
- **API**: http://localhost:8000/api
- **Admin**: http://localhost:8000/admin  
- **Health Check**: http://localhost:8000/api/health
- **Mercure Hub**: http://localhost:3000/.well-known/mercure

## 📞 Soporte

Para problemas durante la instalación:

1. Verificar logs: `var/log/`
2. Verificar configuración: `php bin/console debug:config`
3. Verificar rutas: `php bin/console debug:router`
4. Verificar servicios: `php bin/console debug:container`

¡El sistema está listo para sincronización en tiempo real! 🎉 