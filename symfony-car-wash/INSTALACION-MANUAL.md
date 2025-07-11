# 🚗 Errekalde Car Wash - Instalación Manual para Windows

## Opción 1: Instalación Automática (Requiere Permisos de Administrador)

### Paso 1: Ejecutar PowerShell como Administrador
1. Busca "PowerShell" en el menú inicio
2. Clic derecho → "Ejecutar como administrador"
3. Navega al directorio: `cd C:\Users\USER85\errekalde-car-wash\symfony-car-wash`

### Paso 2: Instalar Chocolatey
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Paso 3: Instalar Prerrequisitos
```powershell
# Instalar PHP
choco install php -y

# Instalar Composer
choco install composer -y

# Instalar MySQL
choco install mysql -y

# Actualizar variables de entorno
refreshenv
```

### Paso 4: Configurar el Proyecto
```powershell
# Instalar dependencias
composer install

# Crear archivo .env
Copy-Item .env.example .env

# Crear base de datos
mysql -u root -e "CREATE DATABASE errekalde_car_wash;"

# Ejecutar migraciones
php bin/console doctrine:migrations:migrate --no-interaction

# Inicializar sistema
php bin/console car-wash:initialize --weeks=12 --spaces=8
```

### Paso 5: Iniciar el Sistema
```powershell
# Iniciar servidor
php -S localhost:8000 -t public/
```

---

## Opción 2: Instalación Manual (Sin Permisos de Administrador)

### Paso 1: Descargar PHP
1. Ve a https://windows.php.net/download/
2. Descarga **PHP 8.3 Thread Safe (x64)**
3. Extrae a `C:\php`
4. Agrega `C:\php` al PATH del sistema

### Paso 2: Descargar Composer
1. Ve a https://getcomposer.org/download/
2. Descarga **Composer-Setup.exe**
3. Ejecuta e instala

### Paso 3: Instalar XAMPP (incluye MySQL)
1. Ve a https://www.apachefriends.org/
2. Descarga **XAMPP**
3. Instala y inicia MySQL desde el panel de control

### Paso 4: Configurar el Proyecto
Abre PowerShell y navega a: `C:\Users\USER85\errekalde-car-wash\symfony-car-wash`

```powershell
# Verificar instalaciones
php -v
composer --version
mysql --version

# Instalar dependencias
composer install

# Crear archivo .env
Copy-Item .env.example .env

# Editar .env con la configuración correcta
notepad .env
```

### Paso 5: Configurar Base de Datos
```powershell
# Crear base de datos (usando phpMyAdmin o línea de comandos)
mysql -u root -e "CREATE DATABASE errekalde_car_wash;"

# Ejecutar migraciones
php bin/console doctrine:migrations:migrate --no-interaction

# Inicializar sistema
php bin/console car-wash:initialize --weeks=12 --spaces=8
```

### Paso 6: Iniciar el Sistema
```powershell
# Iniciar servidor
php -S localhost:8000 -t public/
```

---

## Opción 3: Instalación Rápida (Portátil)

### Descargar Herramientas Portátiles
1. **PHP Portátil**: https://windows.php.net/download/
2. **Composer**: https://getcomposer.org/composer.phar
3. **MySQL Portátil**: https://dev.mysql.com/downloads/mysql/

### Configuración Rápida
1. Extrae PHP a `C:\portable\php`
2. Pon composer.phar en `C:\portable\composer`
3. Configura MySQL portátil
4. Agrega directorios al PATH temporalmente

---

## URLs del Sistema

Una vez instalado, el sistema estará disponible en:
- **Frontend**: http://localhost:8000
- **API**: http://localhost:8000/api
- **Health Check**: http://localhost:8000/api/health

## Comandos Útiles

```powershell
# Resetear espacios
php bin/console car-wash:initialize --reset

# Limpiar cache
php bin/console cache:clear

# Ver logs
Get-Content var/log/dev.log -Wait
```

## Solución de Problemas

### PHP no se reconoce
- Verifica que PHP esté en el PATH
- Reinicia PowerShell después de instalar

### Error de base de datos
- Verifica que MySQL esté iniciado
- Confirma que existe la base de datos `errekalde_car_wash`

### Error de permisos
- Asegúrate de tener permisos de escritura en el directorio
- Ejecuta `chmod 777 var/` si es necesario

## Soporte

Si tienes problemas, ejecuta:
```powershell
php bin/console debug:config
php bin/console doctrine:schema:validate
``` 