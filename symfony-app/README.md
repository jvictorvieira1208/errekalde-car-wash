# 🚗 Errekalde Car Wash - Sistema Symfony

Sistema de reservas moderno para lavado de coches exclusivo para trabajadores de SWAP ENERGIA.

## 🎯 Características Principales

### 🛠️ Tecnologías
- **Backend**: PHP 8.2 + Symfony 6.4
- **Frontend**: Twig + Bootstrap 5 + JavaScript Vanilla
- **Base de Datos**: MariaDB 11.8 (XAMPP)
- **PWA**: Service Worker + Manifest + Offline Support
- **API**: REST JSON con validaciones completas

### ✨ Funcionalidades
- ✅ **Calendario interactivo** - Solo miércoles disponibles
- ✅ **Sistema de pasos** - 5 páginas con validación progresiva
- ✅ **Verificación WhatsApp** - Simulada con código 123456
- ✅ **Selección de servicios** - 6 servicios con precios dinámicos
- ✅ **Sincronización real-time** - Actualización automática cada 5s
- ✅ **Modo offline** - Funcionalidad limitada sin conexión
- ✅ **PWA completa** - Instalable como app nativa
- ✅ **Responsive design** - Optimizado para móviles
- ✅ **Seguridad avanzada** - Validaciones, rate limiting, sanitización

## 🚀 Instalación y Configuración

### Prerrequisitos
```bash
# Requerimientos
- PHP 8.2+ (XAMPP)
- Composer 2.8+
- MariaDB 11.8+ (XAMPP)
- Navegador moderno con PWA support
```

### 1. Configuración de Base de Datos
```bash
# 1. Iniciar XAMPP
C:\xampp\xampp-control.exe

# 2. Crear base de datos
mysql -u root -p
CREATE DATABASE errekalde_car_wash;
USE errekalde_car_wash;

# 3. Importar esquema (desde raíz del proyecto)
SOURCE schema.sql;
```

### 2. Configuración de Symfony
```bash
# 1. Instalar dependencias
cd symfony-app
php ../composer install

# 2. Configurar base de datos
# Crear archivo .env.local con:
DATABASE_URL="mysql://root:@127.0.0.1:3306/errekalde_car_wash?serverVersion=mariadb-10.4.32&charset=utf8mb4"

# 3. Limpiar cache
php bin/console cache:clear
```

### 3. Iniciar Servidor
```bash
# Desde symfony-app/
$env:PATH += ";C:\xampp\php"
php -S localhost:8000 -t public
```

## 📡 API Endpoints

### Principales
```http
GET  /                          # Interfaz principal
GET  /api/health               # Estado del sistema
GET  /api/sync-espacios        # Sincronización global
GET  /api/espacios/{fecha}     # Espacios por fecha
POST /api/reservar             # Crear reserva
POST /api/inicializar-espacios # Inicializar espacios
```

### Ejemplos de Uso

#### Obtener estado del sistema
```bash
curl http://localhost:8000/api/health
```

#### Crear reserva
```bash
curl -X POST http://localhost:8000/api/reservar \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2025-07-16",
    "name": "Juan Pérez",
    "phone": "+34 600 123 456",
    "carBrand": "Toyota",
    "carModel": "Corolla",
    "carSize": "medium",
    "price": 40,
    "notas": "Coche muy sucio"
  }'
```

## 🔒 Características de Seguridad

### Validaciones Implementadas
- ✅ **Sanitización de entrada** - Strip tags + HTML entities
- ✅ **Validación de campos** - Longitud, formato, tipos
- ✅ **Rate Limiting** - Máximo 3 reservas por hora/IP
- ✅ **Prevención duplicados** - Same phone + date
- ✅ **Validación fechas** - Solo miércoles futuros
- ✅ **Formato teléfono** - Regex internacional
- ✅ **Transacciones DB** - Atomicidad garantizada
- ✅ **Logging básico** - Registro de reservas
- ✅ **Escape SQL** - Prepared statements

### Headers de Seguridad Recomendados
```apache
# Para Apache (.htaccess en public/)
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

## 📱 PWA Features

### Capacidades Offline
- ✅ **Cache estratégico** - Static assets + API responses
- ✅ **Fallback pages** - Página offline personalizada
- ✅ **Background sync** - Sincronización diferida
- ✅ **Update notifications** - Notificación de nuevas versiones

### Instalación como App
```javascript
// La app se puede instalar automáticamente
// Prompt aparece después de 2-3 visitas
// Instalable desde menú del navegador
```

### Service Worker Features
```javascript
// Cache strategies implementadas:
- Network First: API calls
- Cache First: Static assets  
- Stale While Revalidate: Images
- Network Only: Real-time data
```

## 🎨 UI/UX Features

### Responsive Design
- ✅ **Mobile-first** - Diseño desde 320px
- ✅ **Touch optimized** - Targets 44px mínimo
- ✅ **Safe areas** - iOS notch support
- ✅ **Gesture support** - Swipe detection
- ✅ **Accessibility** - ARIA labels, contraste

### Modern CSS Features
- ✅ **CSS Grid/Flexbox** - Layout responsivo
- ✅ **Custom properties** - Theming consistente
- ✅ **Dark mode support** - Media query prefers-color-scheme
- ✅ **Reduced motion** - Respeta preferencias usuario
- ✅ **High contrast** - Mejor accesibilidad

## 📊 Base de Datos

### Estructura Optimizada
```sql
-- 5 tablas principales
espacios_disponibles  # Disponibilidad por fecha
reservas             # Datos de reservas
servicios           # Catálogo de servicios  
reserva_servicios   # Relación many-to-many
espacios_audit      # Auditoría de cambios
```

### Índices Optimizados
```sql
-- Índices para rendimiento
INDEX idx_fecha ON espacios_disponibles(fecha)
INDEX idx_phone ON reservas(phone)
INDEX idx_status ON reservas(status)
INDEX idx_reservation_id ON reservas(reservation_id)
```

## 🔧 Desarrollo y Debug

### Logs y Monitoreo
```bash
# Logs de Symfony
tail -f symfony-app/var/log/dev.log

# Logs de Apache/PHP
tail -f C:\xampp\apache\logs\error.log

# Logs de MariaDB
tail -f C:\xampp\mysql\data\*.err
```

### Debug JavaScript
```javascript
// En DevTools Console
console.log('🔧 DEBUG INFO:', {
    espaciosGlobales,
    reservationData,
    currentPage,
    isOnline: navigator.onLine
});
```

### Tests Manual
```bash
# 1. Test API health
curl http://localhost:8000/api/health

# 2. Test PWA
# - Abrir DevTools > Application > Service Workers
# - Verificar registration exitosa
# - Test offline: Network tab > Offline

# 3. Test Responsive
# - DevTools > Device Toolbar
# - Probar diferentes dispositivos
```

## 🚀 Deployment Producción

### Optimizaciones Necesarias
1. **Servidor Web** - Apache/Nginx con HTTPS
2. **PHP-FPM** - Pool dedicado con limits
3. **MariaDB** - Configuración optimizada
4. **CDN** - Para assets estáticos
5. **Compression** - Gzip/Brotli enabled
6. **Caching** - OPcache + Redis/Memcached

### Variables de Entorno
```bash
# .env.prod
APP_ENV=prod
APP_DEBUG=false
DATABASE_URL="mysql://user:pass@prod-db:3306/errekalde_car_wash"
```

## 📈 Monitoring y Analytics

### Métricas Recomendadas
- ✅ **Response times** - API endpoint performance
- ✅ **Error rates** - 4xx/5xx responses
- ✅ **Database queries** - Slow query log
- ✅ **User engagement** - PWA installation rate
- ✅ **Reservation success** - Conversion funnel

### Tools Sugeridas
- **APM**: New Relic, DataDog
- **Logging**: ELK Stack, Fluentd
- **Monitoring**: Prometheus + Grafana
- **Uptime**: Pingdom, UptimeRobot

## 🔄 Migración desde Node.js

El sistema anterior en Node.js ha sido **completamente migrado** a Symfony:

### ✅ Funcionalidades Migradas
- ✅ **API REST completa** - Todos los endpoints
- ✅ **Sincronización real-time** - Cada 5 segundos
- ✅ **Gestión de espacios** - CRUD completo
- ✅ **Sistema de reservas** - Con validaciones
- ✅ **Base de datos** - Schema compatible
- ✅ **Frontend** - Redesigned con Bootstrap 5

### 🆕 Mejoras Añadidas
- 🆕 **PWA completa** - Offline + installable
- 🆕 **Seguridad avanzada** - Validaciones + rate limiting
- 🆕 **UI moderna** - Bootstrap 5 + gradients
- 🆕 **Mobile optimization** - Touch + gestures
- 🆕 **Dark mode** - Auto-detection
- 🆕 **Accessibility** - ARIA + contrast

## 🤝 Contribución

### Estructura del Código
```
symfony-app/
├── src/
│   ├── Controller/           # API endpoints
│   └── Entity/              # Database models
├── templates/               # Twig templates
├── public/                  # Static assets
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
└── config/                  # Symfony config
```

### Coding Standards
- **PHP**: PSR-12 + Symfony conventions
- **JavaScript**: ES6+ + JSDoc comments
- **CSS**: BEM methodology + CSS custom properties
- **SQL**: Snake_case + descriptive names

## 📞 Soporte

### Contacto
- **Desarrollado para**: SWAP ENERGIA
- **Sistema**: Errekalde Car Wash v2.0.0
- **Tecnología**: Symfony 6.4 + MariaDB
- **Status**: ✅ Producción Ready

### URLs del Sistema
- **Frontend**: http://localhost:8000
- **API**: http://localhost:8000/api/*
- **Health**: http://localhost:8000/api/health
- **Database**: localhost:3306/errekalde_car_wash

---

**🚗 Errekalde Car Wash - Powered by Symfony 6.4 & MariaDB** 