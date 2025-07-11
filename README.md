# 🚗 Errekalde Car Wash - Sistema de Reservas

Sistema completo de reservas con sincronización global en tiempo real usando base de datos MySQL/PostgreSQL.

## 🌐 **URLs del Sistema**

### **Frontend (Público)**
```
https://errekalde-car-wash.surge.sh
```

### **Backend (Base de Datos Centralizada)**
- **N8N Universal**: `https://n8nserver.swapenergia.com/webhook/`
- **Local (Desarrollo)**: `http://localhost:3001`

### **Endpoints N8N (Producción)**
- **Espacios**: `https://n8nserver.swapenergia.com/webhook/errekaldecarwash-spaces`
- **Reservas**: `https://n8nserver.swapenergia.com/webhook/errekaldecarwash`
- **Verificación**: `https://n8nserver.swapenergia.com/webhook/validarNúmero`

## 🎯 **Características**

- ✅ **Base de Datos Centralizada Universal** con N8N
- ✅ **Sincronización Global** en tiempo real (3-5 segundos)
- ✅ **Una sola fuente de verdad** - todos los dispositivos conectados
- ✅ **Concurrencia real** - múltiples usuarios simultáneos
- ✅ **Detección automática** de entorno (local/producción)
- ✅ **Responsive** - funciona en móviles, tablets y desktop
- ✅ **Indicadores de estado** - 🟢🟡🔴 para sincronización

## 🏗️ **Arquitectura**

### **Frontend**
- HTML5, CSS3, JavaScript vanilla
- Responsive design con animaciones
- Detección automática de entorno (local/producción)
- Sincronización automática cada 3 segundos
- Indicadores visuales de estado de conexión

### **Backend Centralizado**
- **N8N Universal**: Base de datos centralizada para producción
- **Node.js + Express**: Servidor local para desarrollo
- **Webhooks**: Endpoints para espacios, reservas y verificación
- **Variables globales**: Almacenamiento persistente en N8N

### **Base de Datos**
- **Producción**: N8N (Variables globales persistentes)
- **Local**: MySQL/MariaDB (XAMPP)
- **Sincronización**: Tiempo real entre todos los dispositivos
- **Concurrencia**: Manejo de múltiples usuarios simultáneos

## 🚀 **Instalación Local**

### **Prerequisitos**
- Node.js 18+
- XAMPP (con MariaDB)
- Git

### **Configuración**
```bash
# 1. Clonar repositorio
git clone [URL-DEL-REPO]
cd errekalde-car-wash

# 2. Instalar dependencias
npm install

# 3. Iniciar XAMPP y MariaDB
C:\xampp\xampp-control.exe

# 4. Crear base de datos
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE errekalde_car_wash"
Get-Content schema.sql | C:\xampp\mysql\bin\mysql.exe -u root errekalde_car_wash

# 5. Migrar datos existentes (opcional)
node migrate.js

# 6. Iniciar servidor
npm run dev
```

### **Verificación**
```bash
# Health check
curl http://localhost:3001/api/health

# Espacios disponibles
curl http://localhost:3001/api/espacios
```

## 🌍 **Despliegue en Producción**

Ver guía completa en [`README-RENDER.md`](./README-RENDER.md)

### **Resumen rápido**
1. Subir código a GitHub
2. Crear cuenta en Render.com
3. Desplegar PostgreSQL (gratuito)
4. Desplegar aplicación web
5. Ejecutar schema PostgreSQL
6. Actualizar URL en frontend

## 📊 **API Endpoints**

### **Público**
- `GET /api/health` - Estado del sistema
- `GET /api/espacios` - Espacios disponibles
- `GET /api/sync-espacios` - Sincronización global
- `POST /api/reservar` - Crear reserva

### **Administración**
- `GET /api/estadisticas` - Estadísticas del sistema
- `POST /api/inicializar-espacios` - Inicializar fechas

## 🗄️ **Base de Datos**

### **Tablas**
- `espacios_disponibles` - Control de espacios por fecha
- `reservas` - Información completa de reservas
- `servicios` - Catálogo de servicios
- `reserva_servicios` - Relación M:N reservas-servicios
- `espacios_audit` - Auditoría de cambios

### **Funcionalidades**
- Constraints y validaciones
- Índices optimizados
- Triggers automáticos (PostgreSQL)
- Foreign keys con CASCADE

## 🔧 **Scripts Disponibles**

```bash
npm start          # Servidor universal (Render)
npm run dev        # Servidor local (MySQL)
npm run migrate    # Migrar datos JSON → BD
```

## 🆘 **Troubleshooting**

### **Problemas comunes**
1. **XAMPP no inicia**: Verificar puertos 80 y 3306
2. **Error de conexión BD**: Revisar credenciales en `config.js`
3. **Migración falla**: Verificar que las tablas existan

### **Logs**
- Aplicación: Console del navegador
- Servidor: Terminal donde se ejecuta Node.js
- Base de datos: Logs de MySQL/PostgreSQL

## 📱 **Compatibilidad**

### **Navegadores**
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### **Dispositivos**
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (320px - 767px)

## 🔄 **Sincronización**

### **Modos de Operación**
1. **Online + Backend**: Sincronización real en base de datos
2. **Online sin Backend**: localStorage con webhooks N8N
3. **Offline**: Solo localStorage local

### **Detección Automática**
El sistema detecta automáticamente el entorno y ajusta el comportamiento:
- `localhost` → Conecta a backend local
- `errekalde-car-wash.surge.sh` → Modo producción

## 📈 **Futuras Mejoras**
- [ ] Panel de administración web
- [ ] Notificaciones push
- [ ] Integración WhatsApp Business
- [ ] Reportes y analytics
- [ ] Sistema de descuentos

## 👥 **Contribución**

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 **Licencia**

Este proyecto es propiedad de SWAP ENERGÍA - Errekalde Car Wash.

---

**Desarrollado con ❤️ para Errekalde Car Wash** 