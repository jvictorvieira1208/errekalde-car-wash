# 🗄️ Errekalde Car Wash - Implementación MySQL/MariaDB

## 📋 Descripción

Esta implementación reemplaza el almacenamiento en archivo JSON por una base de datos MySQL/MariaDB, proporcionando:
- **Concurrencia real** para múltiples usuarios simultáneos
- **Transacciones ACID** para consistencia de datos
- **Mejor rendimiento** con consultas optimizadas
- **Escalabilidad** para miles de reservas
- **Auditoría completa** de todos los cambios

## 🚀 Instalación Rápida (Automática)

### Opción 1: Script Automatizado (Windows)
```bash
# Ejecutar el script de instalación automática
install-mysql.bat
```

### Opción 2: Instalación Manual

#### 1. Instalar MariaDB/MySQL

**Windows:**
- Descargar [MariaDB](https://mariadb.org/download/) o usar [XAMPP](https://www.apachefriends.org/)

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mariadb-server mariadb-client
sudo systemctl start mariadb
sudo systemctl enable mariadb
sudo mysql_secure_installation
```

**macOS:**
```bash
brew install mariadb
brew services start mariadb
```

#### 2. Instalar dependencias Node.js
```bash
npm install mysql2 dotenv
```

#### 3. Configurar base de datos
```sql
-- Conectar como root
mysql -u root -p

-- Ejecutar esquema completo
source schema.sql
```

#### 4. Configurar variables de entorno
```bash
# Crear archivo .env
cp config-example.js .env

# Editar .env con tus credenciales:
DB_HOST=localhost
DB_PORT=3306
DB_USER=errekalde_user
DB_PASSWORD=TuPasswordSegura123!
DB_NAME=errekalde_car_wash
```

#### 5. Migrar datos existentes (opcional)
```bash
node migrate.js
```

#### 6. Iniciar servidor
```bash
node server-mysql.js
```

## 📁 Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `schema.sql` | Esquema completo de base de datos |
| `database.js` | Clase DatabaseManager con todas las operaciones |
| `server-mysql.js` | Servidor Express que usa MySQL |
| `migrate.js` | Script para migrar datos desde JSON |
| `install-mysql.bat` | Instalación automatizada (Windows) |
| `config-example.js` | Configuración de ejemplo |

## 🗄️ Esquema de Base de Datos

### Tablas Principales

#### `espacios_disponibles`
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- fecha (DATE, UNIQUE)
- espacios_totales (TINYINT, DEFAULT 8)
- espacios_disponibles (TINYINT, DEFAULT 8)
- created_at, updated_at (TIMESTAMP)
```

#### `reservas`
```sql
- id (BIGINT, AUTO_INCREMENT, PRIMARY KEY)
- reservation_id (VARCHAR(50), UNIQUE)
- fecha (DATE)
- name, phone, car_brand, car_model (VARCHAR)
- car_size (ENUM: 'small', 'medium', 'large')
- price (DECIMAL(6,2))
- notas (TEXT)
- status (ENUM: 'confirmed', 'cancelled', 'completed')
- created_at, updated_at (TIMESTAMP)
```

#### `servicios`
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- service_code (VARCHAR(50), UNIQUE)
- service_name (VARCHAR(100))
- base_price (DECIMAL(6,2))
- is_active (BOOLEAN)
```

#### `reserva_servicios` (Relación Many-to-Many)
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- reserva_id (BIGINT, FK)
- servicio_id (INT, FK)
- price_applied (DECIMAL(6,2))
```

#### `espacios_audit` (Auditoría)
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- fecha (DATE)
- espacios_antes, espacios_despues (TINYINT)
- accion (ENUM: 'reserva', 'cancelacion', 'manual', 'inicializacion')
- reserva_id (BIGINT, FK NULLABLE)
- timestamp (TIMESTAMP)
- detalles (TEXT)
```

## 🔌 API Endpoints

### Espacios Disponibles
```http
GET /api/espacios/:fecha          # Espacios para fecha específica
GET /api/espacios                 # Todos los espacios disponibles
GET /api/sync-espacios           # Sincronización (con timestamp)
```

### Reservas
```http
POST /api/reservar               # Crear nueva reserva
DELETE /api/reservar/:id         # Cancelar reserva
GET /api/reservas/:fecha         # Reservas por fecha
```

### Administración
```http
POST /api/inicializar-espacios   # Inicializar próximos miércoles
POST /api/migrar-datos          # Migrar desde JSON
GET /api/health                 # Estado del sistema
GET /api/estadisticas           # Estadísticas detalladas
```

## 🔄 Migración desde JSON

El script de migración (`migrate.js`) automáticamente:
1. ✅ Crea backup del archivo JSON original
2. ✅ Migra todos los espacios disponibles
3. ✅ Migra todas las reservas existentes
4. ✅ Crea servicios automáticamente
5. ✅ Verifica integridad de datos
6. ✅ Proporciona estadísticas detalladas

```bash
# Migración con opciones
node migrate.js              # Migración normal
node migrate.js --verify     # Solo verificar conexión
node migrate.js --force      # Forzar migración
node migrate.js --help       # Mostrar ayuda
```

## ⚡ Ventajas de MySQL vs JSON

| Característica | JSON Actual | MySQL/MariaDB |
|----------------|-------------|---------------|
| **Concurrencia** | ❌ Un usuario a la vez | ✅ Miles de usuarios simultáneos |
| **Transacciones** | ❌ Sin garantías | ✅ ACID completas |
| **Rendimiento** | ❌ Carga archivo completo | ✅ Consultas optimizadas |
| **Integridad** | ❌ Sin validaciones | ✅ Constraints y validaciones |
| **Auditoría** | ❌ Sin historial | ✅ Registro completo de cambios |
| **Backup** | ❌ Manual | ✅ Automático e incremental |
| **Consultas** | ❌ Requiere código JS | ✅ SQL nativo |
| **Escalabilidad** | ❌ Limitado | ✅ Ilimitado |

## 🔧 Configuración Avanzada

### Pool de Conexiones
```javascript
// En database.js
const DB_CONFIG = {
    connectionLimit: 10,        // Max conexiones simultáneas
    acquireTimeout: 60000,      // Timeout para obtener conexión
    timeout: 60000,             // Timeout para queries
    reconnect: true,            // Reconectar automáticamente
    charset: 'utf8mb4'          // Soporte Unicode completo
};
```

### Variables de Entorno Completas
```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=errekalde_user
DB_PASSWORD=TuPasswordSegura123!
DB_NAME=errekalde_car_wash
DB_CONNECTION_LIMIT=10

# Servidor
PORT=3001

# N8N (webhooks)
N8N_WEBHOOK_URL=https://n8nserver.swapenergia.com/webhook/errekaldecarwash
N8N_VALIDATION_URL=https://n8nserver.swapenergia.com/webhook/validarNúmero
```

## 🛡️ Seguridad

### Configuración Segura
1. **Usuario dedicado** con permisos mínimos necesarios
2. **Passwords fuertes** para todos los usuarios
3. **Conexiones SSL** en producción
4. **Validación de entrada** en todas las queries
5. **Prepared statements** para prevenir SQL injection

### Ejemplo de configuración SSL
```javascript
const DB_CONFIG = {
    // ... otras opciones
    ssl: {
        ca: fs.readFileSync('/path/to/ca-cert.pem'),
        cert: fs.readFileSync('/path/to/client-cert.pem'),
        key: fs.readFileSync('/path/to/client-key.pem')
    }
};
```

## 📊 Monitoreo y Estadísticas

### Health Check
```bash
curl http://localhost:3001/api/health
```

Respuesta:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "config": {
    "host": "localhost",
    "port": 3306,
    "database": "errekalde_car_wash",
    "user": "errekalde_user"
  },
  "statistics": {
    "totalReservas": 156,
    "espaciosDisponibles": { "total_disponibles": 144, "fechas_disponibles": 18 },
    "reservasPorMes": [...]
  }
}
```

## 🚀 Producción

### Optimizaciones para Producción
1. **Índices adicionales** en columnas frecuentemente consultadas
2. **Pool de conexiones** optimizado según carga
3. **Backup automático** programado
4. **Logging avanzado** para debugging
5. **Monitoring** con herramientas como Grafana

### Script de Backup
```bash
# Backup diario automático
mysqldump -u errekalde_user -p errekalde_car_wash > backup_$(date +%Y%m%d).sql
```

## 🔍 Troubleshooting

### Problemas Comunes

#### Error de conexión
```bash
# Verificar que MySQL esté corriendo
systemctl status mariadb

# Verificar puerto
netstat -an | grep 3306

# Probar conexión manual
mysql -u errekalde_user -p -h localhost errekalde_car_wash
```

#### Error de permisos
```sql
-- Verificar permisos del usuario
SHOW GRANTS FOR 'errekalde_user'@'localhost';

-- Otorgar permisos si es necesario
GRANT ALL PRIVILEGES ON errekalde_car_wash.* TO 'errekalde_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Verificar integridad de datos
```bash
# Verificar migración
node migrate.js --verify

# Comparar datos
node -e "
const db = require('./database');
const fs = require('fs');
const json = JSON.parse(fs.readFileSync('reservas.json'));
db.getAllEspacios().then(mysql => {
  console.log('JSON espacios:', Object.keys(json.espacios).length);
  console.log('MySQL espacios:', Object.keys(mysql).length);
}).finally(() => db.close());
"
```

## 📞 Soporte

Para problemas o preguntas sobre la implementación MySQL:
1. Revisar logs en consola del servidor
2. Verificar archivo `.env` tiene las credenciales correctas
3. Confirmar que MySQL/MariaDB está corriendo
4. Probar endpoint `/api/health` para diagnóstico

## 🎯 Próximos Pasos

Una vez que MySQL esté funcionando correctamente:
1. **Reemplazar servidor actual**: `copy server-mysql.js server.js`
2. **Actualizar scripts de inicio** para usar MySQL
3. **Configurar backups automáticos**
4. **Implementar monitoring en producción**
5. **Considerar implementar WebSockets** para sincronización en tiempo real

¡Tu sistema Errekalde Car Wash ahora tiene una base de datos robusta y escalable! 🎉 