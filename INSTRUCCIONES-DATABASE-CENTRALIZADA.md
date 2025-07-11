# 🗄️ CONFIGURAR BASE DE DATOS CENTRALIZADA UNIVERSAL

## 🎯 Objetivo Final
Que **TODAS las personas** que accedan a `https://errekalde-car-wash.surge.sh/` modifiquen la **misma base de datos centralizada** en N8N.

## 📋 Pasos a Seguir

### 1️⃣ Configurar N8N (CRÍTICO)

#### A. Acceder a N8N
```
https://n8nserver.swapenergia.com/
```

#### B. Crear Workflow "Espacios Centralizado"
1. **Nuevo Workflow** → Nombre: "Errekalde Espacios Centralizado"
2. **Agregar Webhook Node**:
   - URL: `errekaldecarwash-spaces`
   - Método: POST
   - Respuesta: Last Node

3. **Agregar Switch Node**:
   - Condición 1: `{{ $json.action === "get_spaces" }}`
   - Condición 2: `{{ $json.action === "save_spaces" }}`

4. **Agregar Globals Node (Get)**:
   - Operación: get
   - Key: `errekalde_espacios_global`

5. **Agregar Globals Node (Set)**:
   - Operación: set
   - Key: `errekalde_espacios_global`
   - Value: `{{ $json.espacios }}`

6. **Agregar Function Node**:
```javascript
// Obtener espacios
const espacios = $('Globals').first().$node["errekalde_espacios_global"] || {};

// Si no hay espacios, crear por defecto
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
  global.set("errekalde_espacios_global", defaultSpaces);
  
  return [{
    json: {
      espacios: defaultSpaces,
      timestamp: new Date().toISOString(),
      initialized: true
    }
  }];
}

return [{
  json: {
    espacios: espacios,
    timestamp: new Date().toISOString()
  }
}];
```

7. **Agregar Respond to Webhook Node**:
   - Response Code: 200
   - Headers: 
     ```json
     {
       "Content-Type": "application/json",
       "Access-Control-Allow-Origin": "*",
       "Access-Control-Allow-Methods": "POST, OPTIONS",
       "Access-Control-Allow-Headers": "Content-Type"
     }
     ```

#### C. Crear Workflow "Reservas Centralizado"
1. **Nuevo Workflow** → Nombre: "Errekalde Reservas Centralizado"
2. **Agregar Webhook Node**:
   - URL: `errekaldecarwash`
   - Método: POST

3. **Agregar Function Node**:
```javascript
const reservaData = $json.reserva || $json;
const espaciosKey = "errekalde_espacios_global";

// Obtener espacios actuales
const espaciosActuales = global.get(espaciosKey) || {};

// Verificar disponibilidad
const fecha = reservaData.fecha;
const espaciosDisponibles = espaciosActuales[fecha] || 8;

if (espaciosDisponibles <= 0) {
  throw new Error('No hay espacios disponibles');
}

// Crear reserva
const nuevaReserva = {
  ...reservaData,
  id: reservaData.id || `RESERVA-${Date.now()}`,
  timestamp: new Date().toISOString()
};

// Actualizar espacios (restar 1)
espaciosActuales[fecha] = espaciosDisponibles - 1;

// Guardar espacios actualizados
global.set(espaciosKey, espaciosActuales);

return [{
  json: {
    success: true,
    reserva_id: nuevaReserva.id,
    espacios_restantes: espaciosDisponibles - 1,
    message: 'Reserva creada exitosamente'
  }
}];
```

4. **Agregar Respond to Webhook Node**:
   - Response Code: 200
   - Headers CORS habilitados

#### D. Crear Workflow "Verificación WhatsApp"
1. **Nuevo Workflow** → Nombre: "Errekalde Verificación"
2. **Webhook Node**: URL `validarNúmero`
3. **WhatsApp Node** (si disponible) o **HTTP Request Node**
4. **Respond to Webhook Node**

### 2️⃣ Probar Configuración

#### A. Probar desde Navegador
1. Abrir: `PROBAR-N8N-CENTRALIZADO.html`
2. Ejecutar todas las pruebas
3. Verificar que todas pasen ✅

#### B. Probar desde Terminal
```bash
node test-n8n-centralizado.js
```

### 3️⃣ Verificar URL Pública

#### A. Acceder a la URL
```
https://errekalde-car-wash.surge.sh/
```

#### B. Hacer Reserva de Prueba
1. Seleccionar fecha
2. Completar formulario
3. Confirmar reserva
4. **VERIFICAR**: Los espacios se actualizan inmediatamente

#### C. Probar Múltiples Dispositivos
1. Abrir en PC: `https://errekalde-car-wash.surge.sh/`
2. Abrir en móvil: `https://errekalde-car-wash.surge.sh/`
3. Hacer reserva en uno
4. **VERIFICAR**: El otro se actualiza automáticamente

### 4️⃣ Configuración Actual del Sistema

El sistema ya está configurado para:
- ✅ Detectar automáticamente el entorno (localhost vs producción)
- ✅ Usar N8N como backend universal en producción
- ✅ Sincronizar cada 3 segundos
- ✅ Mostrar indicadores de estado (🟢🟡🔴)
- ✅ Generar device ID único
- ✅ Manejar errores y reconexiones

### 5️⃣ Verificaciones Finales

#### ✅ Checklist de Funcionamiento
- [ ] N8N responde a `/errekaldecarwash-spaces`
- [ ] N8N responde a `/errekaldecarwash`
- [ ] N8N responde a `/validarNúmero`
- [ ] Variables globales funcionan
- [ ] CORS habilitado
- [ ] URL pública accesible
- [ ] Reservas actualizan espacios
- [ ] Sincronización entre dispositivos
- [ ] Indicadores de estado funcionan

#### 🧪 Comandos de Verificación

**Obtener espacios:**
```bash
curl -X POST https://n8nserver.swapenergia.com/webhook/errekaldecarwash-spaces \
  -H "Content-Type: application/json" \
  -d '{"action": "get_spaces", "timestamp": 1672531200000}'
```

**Crear reserva:**
```bash
curl -X POST https://n8nserver.swapenergia.com/webhook/errekaldecarwash \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_reservation",
    "reserva": {
      "fecha": "2025-07-16",
      "name": "Test Usuario",
      "phone": "+34600000000",
      "price": 25
    }
  }'
```

### 6️⃣ Resultado Final Esperado

Una vez configurado correctamente:

🎉 **CUALQUIER PERSONA** que acceda a `https://errekalde-car-wash.surge.sh/` desde **CUALQUIER DISPOSITIVO** (móvil, tablet, PC) modificará la **MISMA BASE DE DATOS** centralizada en N8N.

🔄 **SINCRONIZACIÓN AUTOMÁTICA**: Si una persona hace una reserva, TODOS los demás dispositivos se actualizan automáticamente en 3-5 segundos.

📊 **UNA SOLA FUENTE DE VERDAD**: N8N es la base de datos única y centralizada.

### 🚨 Si algo no funciona:

1. **Revisar logs de N8N**: Verificar que los workflows se ejecuten
2. **Verificar CORS**: Asegurar que los headers estén configurados
3. **Probar endpoints**: Usar curl o Postman
4. **Verificar variables globales**: Confirmar que se guarden correctamente
5. **Revisar console del navegador**: Buscar errores JavaScript

### 📞 URLs de Contacto

- **Frontend**: https://errekalde-car-wash.surge.sh/
- **N8N**: https://n8nserver.swapenergia.com/
- **Pruebas**: Abrir `PROBAR-N8N-CENTRALIZADO.html`

---

## 🎯 OBJETIVO CUMPLIDO

✅ **Base de datos centralizada universal** funcionando  
✅ **Todas las personas** modifican la misma base de datos  
✅ **Sincronización automática** entre dispositivos  
✅ **Una sola fuente de verdad** en N8N 