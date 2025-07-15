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

// CONFIGURACIÓN POSTGRESQL SIMPLE
let db = null;
const DB_TYPE = process.env.DB_TYPE || 'postgresql';

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

// ENDPOINT SIMPLE CON BD
app.get('/api/espacios', async (req, res) => {
    try {
        if (!db) {
            return res.json({ message: 'Base de datos no configurada, pero servidor funcionando' });
        }
        
        // Crear tabla si no existe
        await db.query(`
            CREATE TABLE IF NOT EXISTS espacios_disponibles (
                id SERIAL PRIMARY KEY,
                fecha DATE NOT NULL UNIQUE,
                espacios_disponibles INTEGER NOT NULL DEFAULT 8
            );
        `);
        
        // Obtener espacios
        const espacios = await db.query('SELECT * FROM espacios_disponibles ORDER BY fecha LIMIT 10;');
        
        res.json({
            success: true,
            espacios: espacios || [],
            message: 'Espacios obtenidos exitosamente'
        });
    } catch (error) {
        console.error('Error en /api/espacios:', error.message);
        res.json({
            success: false,
            message: 'Error en BD, pero servidor funcionando',
            error: error.message
        });
    }
});

// TEST ENDPOINT PARA N8N - SOLO PARA DEBUGGING
app.post('/api/test-n8n', async (req, res) => {
    try {
        console.log('🧪 TEST: Enviando datos de prueba a n8n...');
        
        // Datos de prueba exactos
        const testData = {
            phone: "+34626327017",
            message: `🚗 *RESERVA CONFIRMADA - Errekalde Car Wash* 🚗

✅ Hola Test Usuario, tu reserva está confirmada

📅 *Fecha:* miércoles, 22 de enero de 2025
🕐 *Entrega de llaves:* Entre las 8:00-9:00 en el pabellón

👤 *Cliente:* Test Usuario
📞 *Teléfono:* +34626327017
🚗 *Vehículo:* Toyota Corolla (mediano)
🧽 *Servicio:* Lavado completo
💰 *Precio Total:* 40€
🆔 *ID Reserva:* TEST-${Date.now()}

📍 *IMPORTANTE - SOLO TRABAJADORES SWAP ENERGIA*
🏢 *Ubicación:* Pabellón SWAP ENERGIA
🔑 *Llaves:* Dejar en el pabellón entre 8:00-9:00
🕐 *No hay horario específico de lavado*

*¡Gracias por usar nuestro servicio!* 🤝

_Servicio exclusivo para empleados SWAP ENERGIA_ ✨`,
            type: 'booking',
            reservationId: `TEST-${Date.now()}`,
            reservationData: {
                name: "Test Usuario",
                phone: "+34626327017",
                date: "miércoles, 22 de enero de 2025",
                vehicle: "Toyota Corolla",
                services: "Lavado completo",
                price: 40,
                vehicleSize: "medium",
                notes: "Reserva de prueba"
            }
        };
        
        const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash';
        
        console.log('📡 Enviando a:', N8N_WEBHOOK_URL);
        console.log('📋 Datos de prueba:', JSON.stringify(testData, null, 2));
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        const responseText = await response.text();
        
        console.log('📥 Respuesta de n8n:', {
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
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error en test n8n:', error);
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
        
        // Crear tabla de reservas si no existe
        await db.query(`
            CREATE TABLE IF NOT EXISTS reservas (
                id SERIAL PRIMARY KEY,
                reservation_id VARCHAR(50) UNIQUE NOT NULL,
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
        
        // Insertar reserva en la base de datos
        await db.query(`
            INSERT INTO reservas (
                reservation_id, fecha, nombre, telefono, marca_vehiculo, 
                modelo_vehiculo, tamano_vehiculo, servicios, precio_total, notas
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            reservationId, fecha, nombre, telefono, marca_vehiculo,
            modelo_vehiculo, tamano_vehiculo, servicios, precio_total, notas
        ]);
        
        console.log(`✅ Reserva ${reservationId} guardada en BD`);
        
        // Formatear datos para n8n
        const vehicle = marca_vehiculo && modelo_vehiculo ? 
            `${marca_vehiculo} ${modelo_vehiculo}` : 
            (marca_vehiculo || modelo_vehiculo || 'Sin especificar');
            
        const vehicleSizeText = tamano_vehiculo === 'large' ? 'grande' : 
                               tamano_vehiculo === 'medium' ? 'mediano' : 'pequeño';
        
        // Procesar servicios y suplementos (detectar si hay suplementos en el string de servicios)
        let serviciosBase = servicios || '';
        let suplementos = '';
        
        // Si servicios contiene " + ", separar servicios base de suplementos
        if (servicios && servicios.includes(' + ')) {
            const partes = servicios.split(' + ');
            serviciosBase = partes[0] || '';
            suplementos = partes.slice(1).join(' + ') || '';
        }
        
        // Crear mensaje de confirmación con formato específico
        const message = `🚗 *RESERVA CONFIRMADA - Errekalde Car Wash* 🚗\\n\\n✅ Hola ${nombre}, tu reserva está confirmada\\n\\n📅 *Fecha:* ${fecha}\\n🕐 *Entrega de llaves:* Entre las 8:00-9:00 en el pabellón\\n\\n👤 *Cliente:* ${nombre}\\n📞 *Teléfono:* ${telefono}\\n🚗 *Vehículo:* ${vehicle} (${vehicleSizeText})\\n🧽 *Servicio:* ${servicios}${suplementos ? `\\n✨ *Suplementos:* ${suplementos}` : ''}\\n💰 *Precio Total:* ${precio_total}€\\n🆔 *ID Reserva:* ${reservationId}${notas ? `\\n\\n📝 *Notas adicionales:* ${notas}` : ''}\\n\\n📍 *IMPORTANTE - SOLO TRABAJADORES SWAP ENERGIA*\\n🏢 *Ubicación:* Pabellón SWAP ENERGIA\\n🔑 *Llaves:* Dejar en el pabellón entre 8:00-9:00\\n🕐 *No hay horario específico de lavado*\\n\\n*¡Gracias por usar nuestro servicio!* 🤝\\n\\n_Servicio exclusivo para empleados SWAP ENERGIA_ ✨`;

        // Datos para enviar a n8n (UNA SOLA VEZ) - FORMATO EXACTO REQUERIDO
        const n8nData = {
            phone: telefono,
            message: message,
            type: 'booking',
            reservationId: reservationId,
            reservationData: {
                name: nombre,
                phone: telefono,
                date: fecha,
                vehicle: vehicle,
                services: servicios,
                supplements: suplementos,
                price: precio_total,
                vehicleSize: tamano_vehiculo,
                notes: notas || ''
            }
        };
        
        // Enviar a n8n (UNA SOLA VEZ)
        const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash';
        
        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(n8nData)
            });
            
            if (response.ok) {
                console.log(`✅ Notificación enviada a n8n para reserva ${reservationId}`);
            } else {
                console.error(`❌ Error enviando a n8n: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error enviando a n8n:', error.message);
        }
        
        // Responder al cliente
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