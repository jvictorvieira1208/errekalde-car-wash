# 🗄️ Configuración N8N como Base de Datos Centralizada

## 📋 Objetivo
Configurar N8N para que funcione como **base de datos centralizada universal** donde TODOS los usuarios que accedan a `https://errekalde-car-wash.surge.sh/` modifiquen la misma base de datos.

## 🚀 URLs de N8N Requeridas

### 1. Gestión de Espacios
```
https://n8nserver.swapenergia.com/webhook/errekaldecarwash-spaces
```

### 2. Gestión de Reservas  
```
https://n8nserver.swapenergia.com/webhook/errekaldecarwash
```

### 3. Verificación WhatsApp
```
https://n8nserver.swapenergia.com/webhook/validarNúmero
```

## 🔧 Workflow 1: Gestión de Espacios

### Trigger
- **Tipo**: Webhook
- **URL**: `/errekaldecarwash-spaces`
- **Método**: POST

### Nodes del Workflow

#### 1. Webhook Node
```json
{
  "httpMethod": "POST",
  "path": "errekaldecarwash-spaces",
  "responseMode": "lastNode"
}
```

#### 2. Switch Node (Determinar Acción)
**Condiciones:**
- **Ruta 1**: `{{ $json.action === "get_spaces" }}`
- **Ruta 2**: `{{ $json.action === "save_spaces" }}`

#### 3A. Get Spaces - Globals Node (Obtener)
```json
{
  "operation": "get",
  "key": "errekalde_espacios_global"
}
```

#### 3B. Save Spaces - Globals Node (Guardar)
```json
{
  "operation": "set",
  "key": "errekalde_espacios_global",
  "value": "{{ $json.espacios }}"
}
```

#### 4. Function Node (Formatear Respuesta)
```javascript
// Para Get Spaces
const espacios = $('Globals').first().$node["errekalde_espacios_global"] || {};
const now = new Date().toISOString();

// Si no hay espacios, inicializar
if (Object.keys(espacios).length === 0) {
  const defaultSpaces = {};
  const today = new Date();
  
  for (let i = 0; i < 12; i++) {
    const wednesday = new Date(today);
    const daysUntilWednesday = (3 - today.getDay() + 7) % 7;
    wednesday.setDate(today.getDate() + daysUntilWednesday + (i * 7));
    
    if (wednesday > today) {
      const dateStr = wednesday.toISOString().split('T')[0];
      defaultSpaces[dateStr] = 8;
    }
  }
  
  // Guardar espacios iniciales
  $('Globals1').first().$node.context.global.set("errekalde_espacios_global", defaultSpaces);
  
  return [{
    json: {
      espacios: defaultSpaces,
      timestamp: now,
      initialized: true,
      total_fechas: Object.keys(defaultSpaces).length
    }
  }];
}

return [{
  json: {
    espacios: espacios,
    timestamp: now,
    total_fechas: Object.keys(espacios).length
  }
}];
```

#### 5. Respond to Webhook Node
```json
{
  "options": {
    "responseCode": 200,
    "responseHeaders": {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  }
}
```

## 🔧 Workflow 2: Gestión de Reservas

### Trigger
- **Tipo**: Webhook  
- **URL**: `/errekaldecarwash`
- **Método**: POST

### Nodes del Workflow

#### 1. Webhook Node
```json
{
  "httpMethod": "POST", 
  "path": "errekaldecarwash",
  "responseMode": "lastNode"
}
```

#### 2. Switch Node (Determinar Acción)
**Condiciones:**
- **Ruta 1**: `{{ $json.action === "create_reservation" }}`
- **Ruta 2**: `{{ $json.type === "booking" }}`
- **Ruta 3**: `{{ $json.type === "verification" }}`

#### 3. Function Node (Procesar Reserva)
```javascript
const reservaData = $json.reserva || $json;
const espaciosKey = "errekalde_espacios_global";
const reservasKey = "errekalde_reservas_global";

// Obtener espacios actuales
const espaciosActuales = global.get(espaciosKey) || {};
const reservasActuales = global.get(reservasKey) || [];

// Verificar disponibilidad
const fecha = reservaData.fecha;
const espaciosDisponibles = espaciosActuales[fecha] || 8;

if (espaciosDisponibles <= 0) {
  throw new Error('No hay espacios disponibles para esta fecha');
}

// Crear reserva
const nuevaReserva = {
  ...reservaData,
  id: reservaData.id || `RESERVA-${Date.now()}`,
  timestamp: new Date().toISOString(),
  espacios_antes: espaciosDisponibles,
  espacios_despues: espaciosDisponibles - 1
};

// Actualizar espacios (restar 1)
espaciosActuales[fecha] = espaciosDisponibles - 1;

// Guardar reserva
reservasActuales.push(nuevaReserva);

// Guardar en variables globales
global.set(espaciosKey, espaciosActuales);
global.set(reservasKey, reservasActuales);

return [{
  json: {
    success: true,
    reserva_id: nuevaReserva.id,
    espacios_restantes: espaciosDisponibles - 1,
    message: 'Reserva creada y espacios actualizados',
    whatsapp_data: {
      phone: reservaData.phone,
      message: `🚗 Reserva confirmada: ${nuevaReserva.id}\nFecha: ${fecha}\nEspacios restantes: ${espaciosDisponibles - 1}`
    }
  }
}];
```

#### 4. HTTP Request Node (Enviar WhatsApp)
```json
{
  "url": "{{ $json.whatsapp_data.phone ? 'https://api.whatsapp.com/send' : '' }}",
  "method": "POST",
  "body": {
    "phone": "{{ $json.whatsapp_data.phone }}",
    "message": "{{ $json.whatsapp_data.message }}"
  }
}
```

#### 5. Respond to Webhook Node
```json
{
  "options": {
    "responseCode": 200,
    "responseHeaders": {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  }
}
```

## 🔧 Workflow 3: Verificación WhatsApp

### Trigger
- **Tipo**: Webhook
- **URL**: `/validarNúmero`  
- **Método**: POST

### Nodes del Workflow

#### 1. Webhook Node
```json
{
  "httpMethod": "POST",
  "path": "validarNúmero", 
  "responseMode": "lastNode"
}
```

#### 2. HTTP Request Node (WhatsApp API)
```json
{
  "url": "https://api.whatsapp.business/v1/messages",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer YOUR_WHATSAPP_TOKEN",
    "Content-Type": "application/json"
  },
  "body": {
    "to": "{{ $json.phone }}",
    "type": "text", 
    "text": {
      "body": "{{ $json.message }}"
    }
  }
}
```

#### 3. Respond to Webhook Node
```json
{
  "options": {
    "responseCode": 200,
    "responseHeaders": {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  }
}
```

## 📊 Variables Globales Requeridas

### 1. errekalde_espacios_global
```json
{
  "2025-07-16": 8,
  "2025-07-23": 8, 
  "2025-07-30": 8,
  "2025-08-06": 8,
  "2025-08-13": 8,
  "2025-08-20": 8,
  "2025-08-27": 8,
  "2025-09-03": 8,
  "2025-09-10": 8,
  "2025-09-17": 8,
  "2025-09-24": 8,
  "2025-10-01": 8
}
```

### 2. errekalde_reservas_global
```json
[
  {
    "id": "RESERVA-1752224299809",
    "fecha": "2025-07-16",
    "name": "Usuario Test",
    "phone": "+34600000000",
    "timestamp": "2025-07-11T10:00:00.000Z"
  }
]
```

## ✅ Checklist de Configuración

### Paso 1: Crear Workflows
- [ ] Workflow "Espacios Centralizado" 
- [ ] Workflow "Reservas Centralizado"
- [ ] Workflow "Verificación WhatsApp"

### Paso 2: Configurar Webhooks
- [ ] URL: `/errekaldecarwash-spaces` 
- [ ] URL: `/errekaldecarwash`
- [ ] URL: `/validarNúmero`

### Paso 3: Configurar Variables Globales
- [ ] Variable: `errekalde_espacios_global`
- [ ] Variable: `errekalde_reservas_global`

### Paso 4: Probar Endpoints
- [ ] GET spaces desde N8N
- [ ] SAVE spaces en N8N  
- [ ] CREATE reservation en N8N
- [ ] SEND WhatsApp verification

### Paso 5: Verificar URL Pública
- [ ] Acceder a `https://errekalde-car-wash.surge.sh/`
- [ ] Hacer reserva de prueba
- [ ] Verificar que los espacios se actualicen
- [ ] Probar desde múltiples dispositivos

## 🧪 Comandos de Prueba

### Obtener Espacios
```bash
curl -X POST https://n8nserver.swapenergia.com/webhook/errekaldecarwash-spaces \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_spaces",
    "timestamp": 1752224299809,
    "cache_buster": "REALTIMESYNC2024_1752224299809",
    "source": "test",
    "device_id": "TEST_DEVICE"
  }'
```

### Crear Reserva
```bash
curl -X POST https://n8nserver.swapenergia.com/webhook/errekaldecarwash \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_reservation",
    "reserva": {
      "fecha": "2025-07-16",
      "name": "Usuario Test",
      "phone": "+34600000000",
      "carBrand": "Toyota",
      "carModel": "Corolla",
      "price": 25
    }
  }'
```

## 🎯 Resultado Esperado

Una vez configurado correctamente:

1. **Cualquier persona** que acceda a `https://errekalde-car-wash.surge.sh/`
2. **Modifica la misma base de datos** centralizada en N8N
3. **Los cambios se reflejan** en todos los dispositivos en 3-5 segundos
4. **Una sola fuente de verdad** para todos los espacios y reservas

## 🔍 Debugging

### Logs a Verificar
- N8N execution logs
- Webhook response times
- Global variables content
- Error messages

### Problemas Comunes
- CORS headers missing
- Global variables not persisting
- Webhook URL incorrect
- JSON parsing errors 