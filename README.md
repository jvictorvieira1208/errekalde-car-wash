# Errekalde Car Wash - Sistema de Sincronización Global

## Descripción
Sistema de reservas para lavado de coches exclusivo para trabajadores de SWAP ENERGIA con sincronización global de espacios disponibles en tiempo real.

## Características Principales

### 🗓️ Calendario Inteligente
- Solo permite seleccionar **miércoles**
- Muestra espacios disponibles en tiempo real (8/8, 7/8, etc.)
- Sincronización automática cada 5 segundos entre todos los dispositivos
- Días sin espacios disponibles se muestran en rojo y están deshabilitados

### 🔄 Sincronización Global MEJORADA
- **Backend Node.js** en puerto 3001
- **Base de datos JSON** centralizada (`reservas.json`)
- **API REST** para gestión de reservas y espacios
- **Actualización automática** cada 5 segundos
- **Sincronización en tiempo real** entre todos los dispositivos
- **Indicadores visuales** de estado de sincronización
- **Notificaciones automáticas** de cambios en tiempo real
- **Recuperación automática** ante pérdida de conexión
- **Animaciones inteligentes** cuando cambian los espacios
- **Sincronización inmediata** después de reservas

### 📱 Verificación WhatsApp
- Códigos de verificación enviados por WhatsApp via n8n
- Verificación de números de teléfono
- Confirmación de reservas automática

### 🚗 Detección Automática de Vehículos
- Base de datos de 200+ marcas y 5000+ modelos
- Clasificación automática por tamaño (pequeño/mediano/grande)
- Precios dinámicos según tamaño detectado

## Instalación y Uso

### Opción 1: Inicio Automático (Recomendado)
```bash
# Ejecutar el script de inicio automático
iniciar-sistema.bat
```

### Opción 2: Inicio Manual
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor backend
node server.js

# 3. En otra terminal, iniciar frontend
npx http-server -p 8080 -o
```

## Estructura del Sistema

### Backend (Puerto 3001)
- `server.js` - Servidor Express con API REST
- `reservas.json` - Base de datos de reservas y espacios
- Endpoints:
  - `GET /api/sync-espacios` - Sincronización global
  - `GET /api/espacios/:fecha` - Espacios para fecha específica
  - `POST /api/reservar` - Crear nueva reserva
  - `DELETE /api/reservar/:id` - Cancelar reserva
  - `POST /api/inicializar-espacios` - Inicializar espacios

### Frontend (Puerto 8080)
- `index.html` - Interfaz principal
- `script.js` - Lógica de sincronización y UI
- `styles.css` - Estilos profesionales

## API Endpoints

### Sincronización Global
```javascript
// Obtener todos los espacios disponibles
GET /api/sync-espacios
Response: { espacios: {...}, timestamp: "..." }

// Obtener espacios para fecha específica
GET /api/espacios/2024-01-15
Response: { fecha: "2024-01-15", espacios: 6 }
```

### Gestión de Reservas
```javascript
// Crear nueva reserva
POST /api/reservar
Body: { fecha: "2024-01-15", name: "...", ... }
Response: { success: true, reserva: {...}, espaciosDisponibles: 5 }

// Cancelar reserva
DELETE /api/reservar/123456
Response: { success: true, espaciosDisponibles: 6 }
```

## Funcionamiento de Sincronización MEJORADO

### 🔄 Sincronización Básica
1. **Inicialización**: Al cargar la página, se inicializan 8 espacios para los próximos 12 miércoles
2. **Sincronización Automática**: Cada 5 segundos se consulta el servidor para obtener espacios actualizados
3. **Reserva en Tiempo Real**: Al confirmar una reserva, se reduce inmediatamente el contador global
4. **Visualización Dinámica**: El calendario se actualiza automáticamente mostrando espacios disponibles
5. **Prevención de Conflictos**: El servidor verifica disponibilidad antes de confirmar reservas

### ✨ Nuevas Funcionalidades de Sincronización
1. **Indicador Visual de Estado**: 
   - 🟢 Verde: Sincronizado correctamente
   - 🔵 Azul: Sincronizando datos
   - 🔴 Rojo: Sin conexión
   
2. **Notificaciones Inteligentes**:
   - Notifica cuando alguien más hace una reserva
   - Muestra cambios en espacios disponibles
   - Alerta sobre problemas de conexión
   
3. **Sincronización Adaptativa**:
   - Sincronización inmediata después de reservas
   - Sincronización al volver a la página activa
   - Recuperación automática de conexión
   
4. **Animaciones en Tiempo Real**:
   - Los números de espacios se animan al cambiar
   - Los días del calendario "saltan" cuando se actualizan
   - Efectos visuales para cambios importantes
   
5. **Robustez de Conexión**:
   - Detecta pérdida de conexión a internet
   - Reintenta automáticamente cada 10 segundos
   - Funciona sin conexión mostrando último estado conocido

## Características Técnicas

- **Sincronización**: Polling cada 5 segundos
- **Base de Datos**: JSON con persistencia en disco
- **API**: RESTful con CORS habilitado
- **Frontend**: Vanilla JavaScript con CSS moderno
- **Responsive**: Diseño adaptativo para móviles y desktop

## Monitoreo

### Logs del Servidor
```bash
# Ver logs en tiempo real
tail -f server.log
```

### Estado de Espacios
```bash
# Consultar espacios disponibles
curl http://localhost:3001/api/sync-espacios
```

## Troubleshooting

### Problemas de Sincronización
1. Verificar que el servidor esté corriendo en puerto 3001
2. Comprobar conectividad de red
3. Revisar logs del servidor

### Problemas de Reservas
1. Verificar disponibilidad de espacios
2. Comprobar formato de fecha (YYYY-MM-DD)
3. Revisar datos de reserva completos

## Despliegue

### Local
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:8080`

### Producción
- Configurar variables de entorno
- Usar PM2 para gestión de procesos
- Configurar proxy reverso (nginx)
- Implementar SSL/TLS

## Soporte

Para soporte técnico, contactar al equipo de desarrollo de SWAP ENERGIA.

---
**Desarrollado para SWAP ENERGIA** 🚗✨ 