# 🚀 Desplegar Backend Errekalde Car Wash en Render.com

Esta guía te ayudará a desplegar el backend de Errekalde Car Wash en Render.com con una base de datos PostgreSQL centralizada, accesible desde todos los dispositivos.

## 🎯 **Objetivo**

Crear un backend público accesible desde cualquier dispositivo con:
- ✅ Base de datos PostgreSQL centralizada
- ✅ API REST completa
- ✅ Sincronización en tiempo real
- ✅ Escalabilidad automática

## 📋 **Prerequisitos**

1. **Cuenta en GitHub** (para el código)
2. **Cuenta en Render.com** (gratuita)
3. **Código subido a GitHub**

## 🚀 **Paso 1: Preparar el Repositorio**

### **1.1 Subir código a GitHub**
```bash
# En tu directorio local
git add .
git commit -m "Backend listo para producción con PostgreSQL"
git push origin main
```

### **1.2 Verificar archivos importantes**
- ✅ `server-render.js` (servidor de producción)
- ✅ `schema-postgresql.sql` (esquema de BD)
- ✅ `package.json` (dependencias)
- ✅ `env-example.txt` (variables de entorno)

## 🗄️ **Paso 2: Crear Base de Datos PostgreSQL**

### **2.1 Ir a Render Dashboard**
1. Visita [https://render.com](https://render.com)
2. Haz clic en **"Get Started for Free"**
3. Conecta tu cuenta de GitHub

### **2.2 Crear PostgreSQL Database**
1. Clic en **"New +"**
2. Selecciona **"PostgreSQL"**
3. Configuración:
   ```
   Name: errekalde-car-wash-db
   Database: errekalde_car_wash
   User: errekalde_user
   Region: Frankfurt (EU) o Oregon (US)
   PostgreSQL Version: 15
   Plan: Free ($0/month)
   ```
4. Clic en **"Create Database"**

### **2.3 Obtener URL de conexión**
1. Ve a tu database recién creada
2. Copia la **"External Database URL"**
3. Se ve así: `postgresql://username:password@dpg-xxxxx.oregon-postgres.render.com/database`

## 🌐 **Paso 3: Crear Web Service**

### **3.1 Crear nuevo Web Service**
1. Clic en **"New +"**
2. Selecciona **"Web Service"**
3. Conecta tu repositorio de GitHub
4. Selecciona el repositorio `errekalde-car-wash`

### **3.2 Configurar Web Service**
```
Name: errekalde-car-wash-backend
Environment: Node
Region: Frankfurt (EU) o Oregon (US)
Branch: main
Build Command: npm install
Start Command: npm start
Plan: Free ($0/month)
```

### **3.3 Configurar Variables de Entorno**
En la sección **"Environment Variables"**, agregar:

```
DATABASE_URL=postgresql://tu-url-completa-de-render
DB_TYPE=postgresql
NODE_ENV=production
PORT=10000
ALLOWED_ORIGINS=https://errekalde-car-wash.surge.sh,http://localhost:8080
TZ=Europe/Madrid
```

### **3.4 Crear el servicio**
1. Clic en **"Create Web Service"**
2. Esperar que el deployment termine (5-10 minutos)

## 🗄️ **Paso 4: Configurar Base de Datos**

### **4.1 Conectar a PostgreSQL**
1. Ve a tu database en Render
2. Clic en **"Connect"** → **"External Connection"**
3. Usar estos datos con psql o pgAdmin:

```bash
# Opción 1: Desde terminal (si tienes psql instalado)
psql postgresql://username:password@hostname:port/database

# Opción 2: Desde Render Shell
# Ve a tu database → Shell tab
```

### **4.2 Ejecutar esquema**
1. Copia el contenido de `schema-postgresql.sql`
2. Ejecuta en psql o pgAdmin
3. Verificar que las tablas se crearon:

```sql
\dt
SELECT * FROM espacios_disponibles LIMIT 5;
SELECT * FROM servicios;
```

## 🔗 **Paso 5: Actualizar Frontend**

### **5.1 Obtener URL del backend**
Tu URL será algo como: `https://errekalde-car-wash-backend.onrender.com`

### **5.2 Actualizar script.js**
```javascript
// En script.js, línea ~55
function getServerUrl() {
    // Para desarrollo local
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }
    // Para producción - NUEVA URL DEL BACKEND DESPLEGADO
    return 'https://errekalde-car-wash-backend.onrender.com';
}
```

### **5.3 Actualizar configuración**
```javascript
// Cambiar estas líneas en script.js
const SERVER_URL = getServerUrl();
const IS_PRODUCTION = !window.location.hostname.includes('localhost');

// Usar backend centralizado para sincronización
const BACKEND_SYNC_URL = SERVER_URL ? `${SERVER_URL}/api/sync-espacios` : null;
```

## ✅ **Paso 6: Verificar Deployment**

### **6.1 Probar backend**
```bash
# Health check
curl https://tu-backend.onrender.com/api/health

# Espacios disponibles
curl https://tu-backend.onrender.com/api/espacios

# Sincronización
curl https://tu-backend.onrender.com/api/sync-espacios
```

### **6.2 Probar desde frontend**
1. Abre `https://errekalde-car-wash.surge.sh`
2. Abre consola del navegador (F12)
3. Verificar logs de sincronización
4. Hacer una reserva de prueba

## 🔄 **Paso 7: Configurar Sincronización Universal**

### **7.1 Actualizar funciones de sincronización**
En `script.js`, actualizar para usar el backend desplegado:

```javascript
async function sincronizarEspaciosUniversal() {
    try {
        console.log('🔄 SINCRONIZACIÓN CON BACKEND DESPLEGADO...');
        
        if (SERVER_URL) {
            // Usar backend desplegado para sincronización
            const response = await fetch(`${SERVER_URL}/api/sync-espacios`);
            const data = await response.json();
            
            if (data.espacios) {
                espaciosGlobales = data.espacios;
                actualizarInterfazConEspacios();
                updateSyncStatus('conectado');
                return;
            }
        }
        
        // Fallback a N8N si el backend no responde
        // ... código existente de N8N ...
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
    }
}
```

## 🎉 **URLs Finales**

Una vez completado el despliegue:

### **🌐 Frontend (Público)**
```
https://errekalde-car-wash.surge.sh
```

### **🗄️ Backend (API)**
```
https://errekalde-car-wash-backend.onrender.com
```

### **📊 Endpoints Disponibles**
- `GET /api/health` - Estado del sistema
- `GET /api/espacios` - Todos los espacios
- `GET /api/espacios/:fecha` - Espacios por fecha
- `GET /api/sync-espacios` - Sincronización
- `POST /api/reservar` - Crear reserva
- `POST /api/inicializar-espacios` - Inicializar fechas

## 🔧 **Troubleshooting**

### **Error de CORS**
Si hay errores de CORS, verificar variables de entorno:
```
ALLOWED_ORIGINS=https://errekalde-car-wash.surge.sh
```

### **Error de conexión a BD**
Verificar que `DATABASE_URL` esté configurada correctamente en Render.

### **Logs del servidor**
En Render → tu web service → Logs tab para ver errores en tiempo real.

### **Backend no responde**
Render.com tiene "cold starts" - el primer request puede tardar 30-60 segundos.

## 💡 **Beneficios del Despliegue**

- ✅ **Base de datos centralizada** - Todos los dispositivos comparten la misma BD
- ✅ **Sincronización en tiempo real** - Cambios instantáneos
- ✅ **Escalabilidad automática** - Render maneja el tráfico
- ✅ **SSL automático** - HTTPS incluido
- ✅ **Backup automático** - PostgreSQL con backup diario
- ✅ **Monitoring** - Logs y métricas incluidas

## 🎯 **Resultado Final**

Después de este despliegue:

1. **Cualquier persona** puede acceder a `https://errekalde-car-wash.surge.sh`
2. **Todos los dispositivos** se conectan al mismo backend centralizado
3. **Las reservas se sincronizan** instantáneamente entre dispositivos
4. **La base de datos es única** y centralizada en PostgreSQL
5. **El sistema es escalable** y profesional

¡Tu sistema de reservas ahora está completamente centralizado y accesible desde cualquier dispositivo del mundo! 🌍 