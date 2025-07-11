# 🚗 Errekalde Car Wash - Symfony Edition

Sistema profesional de reservas de lavado de coches con **sincronización en tiempo real** entre dispositivos usando **Symfony 6.4**, **MariaDB** y **WebSockets (Mercure)**.

![Symfony](https://img.shields.io/badge/Symfony-6.4-000000?style=for-the-badge&logo=symfony)
![PHP](https://img.shields.io/badge/PHP-8.3+-777BB4?style=for-the-badge&logo=php)
![MariaDB](https://img.shields.io/badge/MariaDB-11.8+-003545?style=for-the-badge&logo=mariadb)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=for-the-badge&logo=bootstrap)
![Mercure](https://img.shields.io/badge/Mercure-WebSockets-FF6B35?style=for-the-badge)

## 🎯 Características Principales

### ✅ **Base de Datos Centralizada Universal**
- **MariaDB/MySQL** como única fuente de verdad
- **Transacciones ACID** para integridad de datos
- **Operaciones atómicas** para prevenir condiciones de carrera
- **Índices optimizados** para consultas rápidas

### ✅ **Sincronización en Tiempo Real**
- **WebSockets con Mercure** para notificaciones instantáneas
- **Sincronización automática** entre dispositivos en **3-5 segundos**
- **Detección de cambios** y notificaciones push
- **Reconexión automática** en caso de pérdida de conexión

### ✅ **Prevención de Reservas Duplicadas**
- **Control de concurrencia** a nivel de base de datos
- **Bloqueos optimistas** para operaciones críticas
- **Validación en tiempo real** de disponibilidad
- **Rollback automático** en caso de conflictos

### ✅ **Arquitectura Profesional**
- **Symfony 6.4** con mejores prácticas
- **Doctrine ORM** para manejo de datos
- **Repository pattern** para consultas optimizadas
- **Service layer** para lógica de negocio
- **Command pattern** para tareas administrativas

### ✅ **Frontend Moderno**
- **Twig templates** con **Bootstrap 5**
- **JavaScript vanilla** optimizado
- **Responsive design** para móviles, tablets y desktop
- **Indicadores visuales** de estado de sincronización (🟢🟡🔴)

### ✅ **Integración WhatsApp**
- **Códigos de verificación** automáticos
- **Confirmaciones de reserva** por WhatsApp
- **Integración con N8N** para notificaciones

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND PÚBLICO                        │
│              https://errekalde-car-wash.surge.sh/          │
│                                                            │
│  [Mobile] [Tablet] [Desktop] ──┐                          │
└────────────────────────────────┼──────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  SYMFONY BACKEND API                       │
│                    (Tu Servidor)                           │
│                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Controllers │  │  Services   │  │ Repositories│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Entities  │  │  Mercure    │  │   Commands  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└────────────────────┼────────────────────────────┼─────────┘
                     │                            │
                     ▼                            ▼
┌─────────────────────────────────┐  ┌─────────────────────┐
│          MARIADB                │  │    MERCURE HUB      │
│      (Base de Datos             │  │   (WebSockets)      │
│       Centralizada)             │  │                     │
│                                 │  │  ┌─────────────┐    │
│  ┌─────────────────────────┐    │  │  │ Real-time   │    │
│  │ available_spaces        │    │  │  │ Sync        │    │
│  │ reservations           │    │  │  └─────────────┘    │
│  └─────────────────────────┘    │  └─────────────────────┘
└─────────────────────────────────┘
```

## 🚀 Instalación Rápida

### Opción 1: Instalación Automatizada (Linux/macOS)
```bash
# Clonar repositorio
git clone [URL] symfony-car-wash
cd symfony-car-wash

# Ejecutar instalación automatizada
chmod +x install.sh
./install.sh

# Iniciar sistema completo
./start-system.sh
```

### Opción 2: Instalación Manual
```bash
# 1. Instalar dependencias
composer install

# 2. Configurar base de datos
cp .env.example .env
mysql -u root -e "CREATE DATABASE errekalde_car_wash"

# 3. Ejecutar migraciones
php bin/console doctrine:migrations:migrate

# 4. Inicializar espacios
php bin/console car-wash:initialize

# 5. Iniciar servicios
./mercure run --config Caddyfile &  # Terminal 1
symfony server:start --port=8000    # Terminal 2
```

## 📊 Esquema de Base de Datos

### Tabla: `available_spaces`
```sql
CREATE TABLE available_spaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    available_spaces INT NOT NULL,
    total_spaces INT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_date (date)
);
```

### Tabla: `reservations`
```sql
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id VARCHAR(255) NOT NULL UNIQUE,
    available_space_id INT,
    date DATE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    car_brand VARCHAR(100) NOT NULL,
    car_model VARCHAR(100) NOT NULL,
    car_size ENUM('small', 'medium', 'large') NOT NULL,
    services JSON NOT NULL,
    service_names JSON NOT NULL,
    price DECIMAL(8,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    device_id VARCHAR(50),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_date (date),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    FOREIGN KEY (available_space_id) REFERENCES available_spaces(id)
);
```

## 🔄 Flujo de Sincronización

### 1. Usuario Hace Reserva
```php
// ReservationService::createReservation()
$this->entityManager->beginTransaction();

// Bloquear fila para evitar condiciones de carrera
$space = $this->getAvailableSpaceWithLock($date);

// Decrementar espacios de forma atómica
$this->spaceRepository->decrementSpaces($date);

// Publicar actualización en tiempo real
$this->syncService->publishSpaceUpdate($space);

$this->entityManager->commit();
```

### 2. Otros Dispositivos Se Actualizan
```javascript
// car-wash-app.js
mercureEventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'space_update') {
        this.espaciosGlobales[data.space.date] = data.space.availableSpaces;
        this.renderCalendar(); // Re-renderizar con nuevos datos
        this.showNotification('Espacios actualizados en tiempo real');
    }
};
```

### 3. Base de Datos Siempre Consistente
```php
// AvailableSpaceRepository::decrementSpaces()
$sql = '
    UPDATE available_spaces 
    SET available_spaces = available_spaces - 1, 
        updated_at = NOW() 
    WHERE date = :date 
      AND available_spaces > 0 
      AND is_active = 1
';
// Operación atómica que previene overselling
```

## 🛠️ API Endpoints

### Espacios Disponibles
```bash
# Obtener todos los espacios
GET /api/espacios

# Obtener espacios por fecha
GET /api/espacios/2025-07-16

# Sincronización global
GET /api/sync-espacios
```

### Reservas
```bash
# Crear reserva
POST /api/reservar
{
  "date": "2025-07-16",
  "clientName": "Juan Pérez",
  "phone": "+34600000000",
  "carBrand": "Toyota",
  "carModel": "Corolla",
  "carSize": "medium",
  "services": ["complete"],
  "price": 25
}

# Verificar código
POST /api/verificar
{
  "phone": "+34600000000",
  "code": "123456"
}

# Cancelar reserva
DELETE /api/cancelar/{reservationId}
```

### Administración
```bash
# Estadísticas del sistema
GET /api/estadisticas

# Health check
GET /api/health

# Configuración Mercure
GET /api/mercure-config

# Resetear espacios
POST /api/reset-espacios
{
  "spaces": 8
}
```

## 🔧 Comandos de Consola

```bash
# Inicializar sistema
php bin/console car-wash:initialize --weeks=12 --spaces=8

# Resetear todos los espacios
php bin/console car-wash:initialize --reset --spaces=8

# Ejecutar migraciones
php bin/console doctrine:migrations:migrate

# Limpiar cache
php bin/console cache:clear

# Validar esquema
php bin/console doctrine:schema:validate

# Ver rutas disponibles
php bin/console debug:router
```

## 🌐 Configuración para URL Pública

Para conectar `https://errekalde-car-wash.surge.sh/` con tu servidor:

### 1. Configurar Backend
```bash
# En .env
FRONTEND_URL=https://errekalde-car-wash.surge.sh
CORS_ALLOW_ORIGIN=https://errekalde-car-wash.surge.sh
MERCURE_PUBLIC_URL=https://tu-servidor.com:3000/.well-known/mercure
```

### 2. Actualizar Frontend Público
```javascript
// En https://errekalde-car-wash.surge.sh/
window.APP_CONFIG = {
    apiBaseUrl: 'https://tu-servidor.com/api',
    mercureConfig: {
        mercure_url: 'https://tu-servidor.com:3000/.well-known/mercure'
    }
};
```

### 3. Configurar HTTPS
```bash
# Con Let's Encrypt
sudo certbot --apache -d tu-servidor.com

# O configurar proxy reverso
# nginx.conf / apache.conf
```

## 📱 Funcionalidades por Dispositivo

### 🖥️ **Desktop**
- Interfaz completa con calendario interactivo
- Navegación por pasos optimizada
- Indicadores de sincronización en tiempo real
- Panel de administración (opcional)

### 📱 **Mobile**
- Diseño responsive optimizado para táctil
- Calendario adaptado a pantalla pequeña
- Formularios simplificados
- Notificaciones push via WebSockets

### 📱 **Tablet**
- Híbrido entre desktop y mobile
- Aprovecha espacio de pantalla disponible
- Interacciones táctiles optimizadas
- Vista de calendario expandida

## 🔍 Monitoreo y Debugging

### Logs de Aplicación
```bash
# Ver logs en tiempo real
tail -f var/log/dev.log

# Filtrar solo errores
tail -f var/log/prod.log | grep ERROR

# Ver logs de Doctrine
tail -f var/log/dev.log | grep doctrine
```

### Verificar Estado del Sistema
```bash
# Health check completo
curl http://localhost:8000/api/health

# Verificar Mercure
curl http://localhost:3000/.well-known/mercure

# Estadísticas de uso
curl http://localhost:8000/api/estadisticas
```

### Debug de Base de Datos
```sql
-- Ver espacios actuales
SELECT date, available_spaces, total_spaces, updated_at 
FROM available_spaces 
WHERE is_active = 1 
ORDER BY date;

-- Ver reservas recientes
SELECT reservation_id, client_name, date, status, created_at 
FROM reservations 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
ORDER BY created_at DESC;

-- Verificar integridad
SELECT 
    a.date,
    a.total_spaces,
    a.available_spaces,
    COUNT(r.id) as confirmed_reservations,
    (a.total_spaces - a.available_spaces) as expected_reservations
FROM available_spaces a
LEFT JOIN reservations r ON a.date = r.date AND r.status = 'confirmed'
WHERE a.is_active = 1
GROUP BY a.id
HAVING confirmed_reservations != expected_reservations;
```

## 🎯 Ventajas vs Sistema Anterior

| Aspecto | Sistema Anterior (N8N/Node.js) | Sistema Nuevo (Symfony/MariaDB) |
|---------|--------------------------------|----------------------------------|
| **Base de Datos** | localStorage + N8N Variables | MariaDB Centralizada |
| **Concurrencia** | Sin control de concurrencia | Transacciones ACID + Bloqueos |
| **Consistencia** | Eventually consistent | Inmediatamente consistente |
| **Escalabilidad** | Limitada por N8N | Escalable horizontalmente |
| **Mantenimiento** | Código JavaScript distribuido | Arquitectura estructurada |
| **Testing** | Difícil de testear | PHPUnit + Tests automatizados |
| **Debugging** | Console logs básicos | Logs estructurados + Profiler |
| **Performance** | Dependiente de webhooks | Consultas SQL optimizadas |

## 🚀 Roadmap Futuro

- [ ] **Panel de Administración Web** completo
- [ ] **API REST completa** para integraciones
- [ ] **Notificaciones Push** nativas
- [ ] **Reportes y Analytics** avanzados
- [ ] **Sistema de Descuentos** configurable
- [ ] **Integración con Calendarios** (Google, Outlook)
- [ ] **Multi-tenancy** para múltiples empresas
- [ ] **App Móvil Nativa** (React Native/Flutter)

## 📞 Soporte y Contribución

### Reportar Issues
1. Verificar logs: `var/log/`
2. Reproducir el problema
3. Crear issue con detalles completos

### Contribuir
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'feat: nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📄 Licencia

MIT License - Ver archivo `LICENSE` para más detalles.

---

## 🎉 ¡Sistema Listo!

**Tu nuevo sistema de reservas con Symfony está completamente configurado para:**

✅ **Sincronización en tiempo real** entre todos los dispositivos  
✅ **Base de datos centralizada** que previene reservas duplicadas  
✅ **Arquitectura escalable** y profesional  
✅ **Integración perfecta** con tu URL pública  

**¡Disfruta de un sistema de reservas verdaderamente profesional!** 🚗✨ 