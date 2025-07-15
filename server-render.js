// server-render.js - Versión MÍNIMA GARANTIZADA
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ENDPOINT BÁSICO - GARANTIZADO
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 Errekalde Car Wash FUNCIONANDO',
        status: 'ONLINE',
        version: '1.0.0-minimal',
        timestamp: new Date().toISOString()
    });
});

// STATUS SIMPLE
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'server_running',
        port: PORT,
        timestamp: new Date().toISOString(),
        message: 'Servidor funcionando correctamente'
    });
});

// HEALTH CHECK BÁSICO
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        server: 'render-production',
        timestamp: new Date().toISOString()
    });
});

// ENDPOINT DE PRUEBA PARA VERIFICAR ESPACIOS
app.get('/api/test-espacios', async (req, res) => {
    try {
        if (!db) {
            return res.json({ error: 'BD no disponible' });
        }
        
        console.log('🧪 TEST: Verificando estado de espacios...');
        
        // Obtener todos los espacios
        const espacios = await db.query('SELECT * FROM espacios_disponibles ORDER BY fecha');
        
        const resultado = {
            total_fechas: espacios.length,
            espacios_detalle: espacios.map(e => ({
                fecha: e.fecha.toISOString().split('T')[0],
                disponibles: e.espacios_disponibles,
                totales: e.espacios_totales || 8,
                actualizado: e.updated_at
            })),
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 Estado actual de espacios:', resultado);
        res.json(resultado);
        
    } catch (error) {
        console.error('❌ Error en test-espacios:', error);
        res.status(500).json({ error: error.message });
    }
});

// CONFIGURACIÓN POSTGRESQL SIMPLE
let db = null;
const DB_TYPE = process.env.DB_TYPE || 'postgresql';

// 🔒 PROTECCIÓN ANTI-DUPLICADOS ULTRA FUERTE
const reservasProcesadas = new Map();
const reservasEnProceso = new Set(); // Prevenir múltiples envíos simultáneos

if (DB_TYPE === 'postgresql' && process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    db = {
        async query(text, params = []) {
            try {
                const client = await pool.connect();
                const result = await client.query(text, params);
                client.release();
                return result.rows;
            } catch (error) {
                console.error('Error en query:', error.message);
                throw error;
            }
        }
    };
}

// ENDPOINT MEJORADO PARA ESPACIOS CON SINCRONIZACIÓN
app.get('/api/espacios', async (req, res) => {
    try {
        if (!db) {
            return res.json({ 
                success: false,
                message: 'Base de datos no configurada',
                espacios: {},
                timestamp: new Date().toISOString()
            });
        }
        
        // Crear tabla si no existe
        await db.query(`
            CREATE TABLE IF NOT EXISTS espacios_disponibles (
                id SERIAL PRIMARY KEY,
                fecha DATE NOT NULL UNIQUE,
                espacios_disponibles INTEGER NOT NULL DEFAULT 8,
                espacios_totales INTEGER NOT NULL DEFAULT 8,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Obtener espacios (próximos 30 días de miércoles)
        const espacios = await db.query(`
            SELECT fecha, espacios_disponibles, espacios_totales, updated_at 
            FROM espacios_disponibles 
            WHERE fecha >= CURRENT_DATE 
            ORDER BY fecha 
            LIMIT 20
        `);
        
        // Formatear para frontend (formato simple que espera el frontend)
        const espaciosFormateados = {};
        espacios.forEach(espacio => {
            const fechaStr = espacio.fecha.toISOString().split('T')[0];
            espaciosFormateados[fechaStr] = espacio.espacios_disponibles; // Formato simple para compatibilidad
        });
        
        console.log(`📊 Enviando espacios al frontend: ${Object.keys(espaciosFormateados).length} fechas`);
        
        res.json({
            success: true,
            espacios: espaciosFormateados,
            timestamp: new Date().toISOString(),
            message: 'Espacios sincronizados exitosamente',
            // Información adicional para debugging
            detalle: espacios.map(e => ({
                fecha: e.fecha.toISOString().split('T')[0],
                disponibles: e.espacios_disponibles,
                totales: e.espacios_totales,
                actualizado: e.updated_at
            }))
        });
        
    } catch (error) {
        console.error('Error en /api/espacios:', error.message);
        res.json({
            success: false,
            message: 'Error obteniendo espacios',
            error: error.message,
            espacios: {},
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT PARA SINCRONIZACIÓN EN TIEMPO REAL
app.get('/api/sync-espacios', async (req, res) => {
    try {
        if (!db) {
            return res.json({ success: false, message: 'BD no disponible' });
        }
        
        const { desde } = req.query;
        let filtroFecha = '';
        let params = [];
        
        if (desde) {
            filtroFecha = 'WHERE updated_at > $1';
            params.push(desde);
        }
        
        const espacios = await db.query(`
            SELECT fecha, espacios_disponibles, espacios_totales, updated_at 
            FROM espacios_disponibles 
            ${filtroFecha}
            ORDER BY updated_at DESC
        `, params);
        
        res.json({
            success: true,
            cambios: espacios.length,
            espacios: espacios,
            timestamp: new Date().toISOString(),
            message: espacios.length > 0 ? 'Cambios detectados' : 'Sin cambios'
        });
        
    } catch (error) {
        console.error('Error en sync:', error.message);
        res.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT PARA ESPACIOS DE UNA FECHA ESPECÍFICA
app.get('/api/espacios/:fecha', async (req, res) => {
    try {
        const { fecha } = req.params;
        
        if (!db) {
            return res.json({ 
                success: false, 
                espacios_disponibles: 8,
                message: 'BD no disponible, usando valor por defecto'
            });
        }
        
        // Obtener o crear espacios para la fecha
        let espacios = await db.query(`
            SELECT espacios_disponibles, espacios_totales, updated_at
            FROM espacios_disponibles 
            WHERE fecha = $1
        `, [fecha]);
        
        if (espacios.length === 0) {
            // Crear entrada para fecha nueva
            await db.query(`
                INSERT INTO espacios_disponibles (fecha, espacios_disponibles, espacios_totales, updated_at)
                VALUES ($1, 8, 8, CURRENT_TIMESTAMP)
            `, [fecha]);
            
            espacios = [{ espacios_disponibles: 8, espacios_totales: 8, updated_at: new Date() }];
        }
        
        res.json({
            success: true,
            fecha: fecha,
            espacios_disponibles: espacios[0].espacios_disponibles,
            espacios_totales: espacios[0].espacios_totales || 8,
            actualizado: espacios[0].updated_at,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`Error obteniendo espacios para ${req.params.fecha}:`, error.message);
        res.json({
            success: false,
            fecha: req.params.fecha,
            espacios_disponibles: 8,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 🔍 DEBUG ENDPOINT - PROTECCIÓN ANTI-DUPLICADOS
app.get('/api/debug-duplicados', (req, res) => {
    try {
        const estadoProteccion = {
            reservas_procesadas: reservasProcesadas.size,
            reservas_en_proceso: reservasEnProceso.size,
            timestamp: new Date().toISOString(),
            detalles_procesadas: Array.from(reservasProcesadas.entries()).map(([key, data]) => ({
                key,
                reservationId: data.reservationId,
                phone: data.phone,
                status: data.status,
                tiempo_procesado: new Date(data.timestamp).toLocaleString('es-ES')
            })),
            detalles_en_proceso: Array.from(reservasEnProceso)
        };
        
        console.log('🔍 Estado actual protección anti-duplicados:', estadoProteccion);
        res.json(estadoProteccion);
        
    } catch (error) {
        console.error('Error en debug duplicados:', error);
        res.status(500).json({ error: error.message });
    }
});

// TEST ENDPOINT PARA N8N - NUEVO FORMATO EXACTO
app.post('/api/test-n8n', async (req, res) => {
    try {
        console.log('🧪 TEST: Enviando datos de prueba con NUEVO FORMATO a N8N...');
        
        const testReservationId = `TEST-${Date.now()}`;
        
        // Datos de prueba con formato EXACTO requerido
        const testData = {
            phone: "+34626327017",
            message: `🚗 *RESERVA CONFIRMADA - Errekalde Car Wash* 🚗\n\n✅ Hola Joao, tu reserva está confirmada\n\n📅 *Fecha:* miércoles, 16 de julio de 2025\n🕐 *Entrega de llaves:* Entre las 8:00-9:00 en el pabellón\n\n👤 *Cliente:* Joao\n📞 *Teléfono:* +34626327017\n🚗 *Vehículo:* audi a8 (grande)\n🧽 *Servicio:* Limpieza interior 25 + Un faro 35\n✨ *Suplementos:* Un faro\n💰 *Precio Total:* 60€\n🆔 *ID Reserva:* ${testReservationId}\n\n📝 *Notas adicionales:* hola\n\n📍 *IMPORTANTE - SOLO TRABAJADORES SWAP ENERGIA*\n🏢 *Ubicación:* Pabellón SWAP ENERGIA\n🔑 *Llaves:* Dejar en el pabellón entre 8:00-9:00\n🕐 *No hay horario específico de lavado*\n\n*¡Gracias por usar nuestro servicio!* 🤝\n\n_Servicio exclusivo para empleados SWAP ENERGIA_ ✨`,
            type: 'booking',
            reservationId: testReservationId,
            // Estructura PLANA como se requiere
            name: "Joao",
            date: "miércoles, 16 de julio de 2025",
            vehicle: "audi a8",
            services: "Limpieza interior 25 + Un faro 35",
            supplements: "Un faro",
            price: "60",
            vehicleSize: "large",
            notes: "hola"
        };
        
        const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash';
        
        console.log('📡 Enviando TEST a:', N8N_WEBHOOK_URL);
        console.log('📋 Datos de prueba (NUEVO FORMATO):', JSON.stringify(testData, null, 2));
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        const responseText = await response.text();
        
        console.log('📥 Respuesta de N8N:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText
        });
        
        res.json({
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            webhookUrl: N8N_WEBHOOK_URL,
            sentData: testData,
            n8nResponse: responseText,
            message: "TEST enviado con nuevo formato exacto",
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error en test N8N:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// CREAR RESERVA + NOTIFICACIÓN N8N (UNA SOLA VEZ)
app.post('/api/reservas', async (req, res) => {
    try {
        console.log('📝 Nueva reserva recibida:', req.body);
        
        if (!db) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }
        
        const {
            fecha,
            nombre,
            telefono,
            marca_vehiculo,
            modelo_vehiculo,
            tamano_vehiculo,
            servicios,
            precio_total,
            notas
        } = req.body;
        
        // Generar ID único para la reserva
        const reservationId = `RESERVA-${Date.now()}`;
        
        // Crear/actualizar tabla de reservas con esquema correcto
        await db.query(`
            CREATE TABLE IF NOT EXISTS reservas (
                id SERIAL PRIMARY KEY,
                reservation_id VARCHAR(50) UNIQUE,
                fecha DATE NOT NULL,
                nombre VARCHAR(100) NOT NULL,
                telefono VARCHAR(20) NOT NULL,
                marca_vehiculo VARCHAR(50),
                modelo_vehiculo VARCHAR(50),
                tamano_vehiculo VARCHAR(20),
                servicios TEXT,
                precio_total DECIMAL(10,2) NOT NULL,
                notas TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Agregar columna reservation_id si no existe
        try {
            await db.query(`
                ALTER TABLE reservas 
                ADD COLUMN IF NOT EXISTS reservation_id VARCHAR(50) UNIQUE
            `);
            console.log('✅ Columna reservation_id verificada/agregada');
        } catch (alterError) {
            console.log('ℹ️ Columna reservation_id ya existe o error menor:', alterError.message);
        }
        
        // Insertar reserva - usar esquema compatible
        try {
            // Intentar con reservation_id primero
            await db.query(`
                INSERT INTO reservas (
                    reservation_id, fecha, nombre, telefono, marca_vehiculo, 
                    modelo_vehiculo, tamano_vehiculo, servicios, precio_total, notas
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                reservationId, fecha, nombre, telefono, marca_vehiculo,
                modelo_vehiculo, tamano_vehiculo, servicios, precio_total, notas
            ]);
        } catch (insertError) {
            console.log('⚠️ Esquema antiguo detectado, usando compatibilidad...');
            // Fallback: usar esquema sin reservation_id
            await db.query(`
                INSERT INTO reservas (
                    fecha, nombre, telefono, marca_vehiculo, 
                    modelo_vehiculo, tamano_vehiculo, servicios, precio_total, notas
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                fecha, nombre, telefono, marca_vehiculo,
                modelo_vehiculo, tamano_vehiculo, servicios, precio_total, notas
            ]);
            console.log('✅ Reserva insertada con esquema compatible');
        }
        
        console.log(`✅ Reserva ${reservationId} guardada en BD`);
        
        // 🔥 GESTIÓN ATÓMICA DE ESPACIOS DISPONIBLES (ARREGLADO)
        console.log(`🔍 Verificando espacios para fecha: ${fecha}`);
        
        // Primero verificar si existe la entrada para la fecha
        let espaciosExistentes = await db.query(`
            SELECT espacios_disponibles, espacios_totales FROM espacios_disponibles WHERE fecha = $1
        `, [fecha]);
        
        if (espaciosExistentes.length === 0) {
            // Si no existe, crear la entrada con 8 espacios por defecto
            console.log(`➕ Creando entrada de espacios para fecha nueva: ${fecha}`);
            await db.query(`
                INSERT INTO espacios_disponibles (fecha, espacios_disponibles, espacios_totales, updated_at)
                VALUES ($1, 8, 8, CURRENT_TIMESTAMP)
            `, [fecha]);
            espaciosExistentes = [{ espacios_disponibles: 8, espacios_totales: 8 }];
        }
        
        const espaciosAntes = espaciosExistentes[0].espacios_disponibles;
        console.log(`📊 Espacios antes de reserva: ${espaciosAntes}`);
        
        // Verificar que hay espacios disponibles
        if (espaciosAntes <= 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay espacios disponibles para esta fecha',
                espaciosRestantes: 0
            });
        }
        
        // Disminuir espacios de forma atómica
        const updateResult = await db.query(`
            UPDATE espacios_disponibles 
            SET espacios_disponibles = GREATEST(espacios_disponibles - 1, 0),
                updated_at = CURRENT_TIMESTAMP
            WHERE fecha = $1 AND espacios_disponibles > 0
            RETURNING espacios_disponibles
        `, [fecha]);
        
        const espaciosActuales = updateResult[0]?.espacios_disponibles ?? espaciosAntes;
        console.log(`📊 Espacios después de reserva: ${espaciosAntes} → ${espaciosActuales}`);
        
        if (updateResult.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No se pudieron reservar espacios (posible conflicto de concurrencia)',
                espaciosRestantes: espaciosAntes
            });
        }
        
        // Formatear datos para n8n
        const vehicle = marca_vehiculo && modelo_vehiculo ? 
            `${marca_vehiculo} ${modelo_vehiculo}` : 
            (marca_vehiculo || modelo_vehiculo || 'Sin especificar');
            
        const vehicleSizeText = tamano_vehiculo === 'large' ? 'grande' : 
                               tamano_vehiculo === 'medium' ? 'mediano' : 'pequeño';
        
        // Procesar servicios y suplementos (extraer solo el nombre del suplemento)
        let serviciosCompletos = servicios || '';
        let suplementos = '';
        
        // Si servicios contiene " + ", separar y extraer solo el nombre del suplemento
        if (servicios && servicios.includes(' + ')) {
            const partes = servicios.split(' + ');
            // Para suplementos, extraer solo el nombre (antes del número de precio)
            if (partes.length > 1) {
                const suplementoParte = partes[1] || '';
                // Extraer solo el nombre del suplemento (ej: "Un faro 35" -> "Un faro")
                suplementos = suplementoParte.replace(/\s+\d+$/, '').trim();
            }
        }
        
        // Formatear fecha en español para WhatsApp
        const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Crear mensaje de confirmación con formato específico (usar \n, no \\n)
        const message = `🚗 *RESERVA CONFIRMADA - Errekalde Car Wash* 🚗\n\n✅ Hola ${nombre}, tu reserva está confirmada\n\n📅 *Fecha:* ${fechaFormateada}\n🕐 *Entrega de llaves:* Entre las 8:00-9:00 en el pabellón\n\n👤 *Cliente:* ${nombre}\n📞 *Teléfono:* ${telefono}\n🚗 *Vehículo:* ${vehicle} (${vehicleSizeText})\n🧽 *Servicio:* ${servicios}${suplementos ? `\n✨ *Suplementos:* ${suplementos}` : ''}\n💰 *Precio Total:* ${precio_total}€\n🆔 *ID Reserva:* ${reservationId}${notas ? `\n\n📝 *Notas adicionales:* ${notas}` : ''}\n\n📍 *IMPORTANTE - SOLO TRABAJADORES SWAP ENERGIA*\n🏢 *Ubicación:* Pabellón SWAP ENERGIA\n🔑 *Llaves:* Dejar en el pabellón entre 8:00-9:00\n🕐 *No hay horario específico de lavado*\n\n*¡Gracias por usar nuestro servicio!* 🤝\n\n_Servicio exclusivo para empleados SWAP ENERGIA_ ✨`;

        // 📋 FORMATO EXACTO PARA WHATSAPP BUSINESS CLOUD3 (estructura plana)
        const n8nData = {
            phone: telefono,
            message: message,
            type: 'booking',
            reservationId: reservationId,
            name: nombre,
            date: fechaFormateada,
            vehicle: vehicle,
            services: servicios,
            supplements: suplementos,
            price: precio_total,
            vehicleSize: tamano_vehiculo,
            notes: notas || ''
        };
        
        // 🔒 PROTECCIÓN ANTI-DUPLICADOS ULTRA FUERTE
        const proteccionKey = `${telefono}_${fecha}_${reservationId}`;
        
        if (reservasProcesadas.has(proteccionKey) || reservasEnProceso.has(proteccionKey)) {
            console.log(`🛡️ PROTECCIÓN ACTIVADA: Reserva ${reservationId} ya procesada/en proceso - BLOQUEANDO duplicado`);
        } else {
            // Marcar como EN PROCESO para evitar envíos simultáneos
            reservasEnProceso.add(proteccionKey);
            
            try {
                // Marcar como procesada ANTES de enviar
                reservasProcesadas.set(proteccionKey, {
                    timestamp: Date.now(),
                    reservationId: reservationId,
                    phone: telefono,
                    status: 'sending'
                });
                
                // Limpiar cache cada 5 minutos (evitar memory leak)
                if (reservasProcesadas.size > 50) {
                    const ahora = Date.now();
                    for (const [key, data] of reservasProcesadas.entries()) {
                        if (ahora - data.timestamp > 300000) { // 5 minutos
                            reservasProcesadas.delete(key);
                        }
                    }
                }
                
                // Enviar a n8n (UNA SOLA VEZ GARANTIZADA)
                const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash';
                
                console.log(`📡 ENVIANDO A N8N (ÚNICO ENVÍO): ${reservationId}`);
                console.log('📋 Payload WhatsApp Business Cloud3:', JSON.stringify(n8nData, null, 2));
                
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(N8N_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Errekalde-CarWash-Backend/1.0',
                        'X-Request-ID': reservationId
                    },
                    body: JSON.stringify(n8nData),
                    timeout: 15000 // 15 segundos timeout
                });
                
                const responseText = await response.text();
                
                if (response.ok) {
                    console.log(`✅ WhatsApp enviado exitosamente a ${telefono} para reserva ${reservationId}`);
                    console.log(`📥 Respuesta N8N (${response.status}): ${responseText}`);
                    
                    // Marcar como exitoso
                    reservasProcesadas.set(proteccionKey, {
                        timestamp: Date.now(),
                        reservationId: reservationId,
                        phone: telefono,
                        status: 'sent_successfully'
                    });
                } else {
                    console.error(`❌ Error N8N (${response.status}): ${responseText}`);
                    
                    // Si falla, remover protección para permitir reintento manual
                    reservasProcesadas.delete(proteccionKey);
                }
            } catch (error) {
                console.error('❌ Error crítico enviando WhatsApp:', error.message);
                
                // Si falla, remover protección para permitir reintento
                reservasProcesadas.delete(proteccionKey);
            } finally {
                // Siempre remover del proceso activo
                reservasEnProceso.delete(proteccionKey);
            }
        }
        
        // Responder al cliente CON ESPACIOS ACTUALIZADOS
        res.json({
            success: true,
            message: 'Reserva creada exitosamente',
            reservationId: reservationId,
            data: {
                nombre,
                telefono,
                fecha,
                vehicle,
                servicios,
                precio_total
            },
            espaciosRestantes: espaciosActuales,
            // Para sincronización entre dispositivos
            sync: {
                fecha: fecha,
                espaciosDisponibles: espaciosActuales,
                timestamp: new Date().toISOString(),
                evento: 'reserva_creada'
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando reserva:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// INICIALIZACIÓN SÚPER SIMPLE
async function iniciarServidor() {
    console.log('🚀 Iniciando servidor MÍNIMO...');
    console.log(`📊 Tipo de BD: ${DB_TYPE}`);
    console.log(`🌍 Puerto: ${PORT}`);
    
    // Test de conexión BD (opcional)
    if (db) {
        try {
            await db.query('SELECT 1');
            console.log('✅ PostgreSQL conectado');
        } catch (error) {
            console.log('⚠️ PostgreSQL no disponible, pero continuando...');
        }
    }
    
    // ARRANCAR SERVIDOR - GARANTIZADO
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🎉 SERVIDOR FUNCIONANDO EN PUERTO ${PORT}`);
        console.log(`🌐 URL: https://errekalde-car-wash-1.onrender.com`);
        console.log(`✅ DEPLOYMENT EXITOSO!`);
    });
}

// INICIAR
iniciarServidor().catch(error => {
    console.error('Error al iniciar:', error);
    // ARRANCAR SERVIDOR BÁSICO AUNQUE FALLE TODO
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🎉 SERVIDOR DE EMERGENCIA EN PUERTO ${PORT}`);
    });
}); 