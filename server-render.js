// server-render.js - Servidor de Producción para Errekalde Car Wash
// Soporta PostgreSQL (Render) y MariaDB/MySQL (desarrollo)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de base de datos universal
let db;
const DB_TYPE = process.env.DB_TYPE || 'postgresql'; // 'postgresql' o 'mysql'

// Importar el gestor de BD apropiado
if (DB_TYPE === 'postgresql') {
    const { Pool } = require('pg');
    
    // Configuración PostgreSQL para Render
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Wrapper para PostgreSQL
    db = {
        async query(text, params = []) {
            const client = await pool.connect();
            try {
                const result = await client.query(text, params);
                return result.rows;
            } finally {
                client.release();
            }
        },
        
        async getEspaciosByFecha(fecha) {
            const result = await this.query(
                'SELECT espacios_disponibles FROM espacios_disponibles WHERE fecha = $1',
                [fecha]
            );
            return result[0] || null;
        },
        
        async getAllEspacios() {
            const result = await this.query(`
                SELECT fecha, espacios_disponibles 
                FROM espacios_disponibles 
                WHERE fecha >= CURRENT_DATE 
                ORDER BY fecha ASC
            `);
            
            const espacios = {};
            result.forEach(row => {
                espacios[row.fecha] = row.espacios_disponibles;
            });
            return espacios;
        },
        
        async inicializarEspacios(fecha, espaciosTotales = 8) {
            await this.query(`
                INSERT INTO espacios_disponibles (fecha, espacios_disponibles, espacios_totales)
                VALUES ($1, $2, $3)
                ON CONFLICT (fecha) DO NOTHING
            `, [fecha, espaciosTotales, espaciosTotales]);
        },
        
        async hacerReserva(reservaData) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Verificar espacios disponibles
                const espaciosResult = await client.query(
                    'SELECT espacios_disponibles FROM espacios_disponibles WHERE fecha = $1 FOR UPDATE',
                    [reservaData.fecha]
                );
                
                if (!espaciosResult.rows[0] || espaciosResult.rows[0].espacios_disponibles <= 0) {
                    throw new Error('No hay espacios disponibles para esta fecha');
                }
                
                // Crear reserva
                const reservaResult = await client.query(`
                    INSERT INTO reservas (
                        fecha, nombre, telefono, marca_vehiculo, modelo_vehiculo, 
                        tamano_vehiculo, servicios, precio_total, notas
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id
                `, [
                    reservaData.fecha,
                    reservaData.name,
                    reservaData.phone,
                    reservaData.carBrand,
                    reservaData.carModel,
                    reservaData.carSize,
                    JSON.stringify(reservaData.services),
                    reservaData.price,
                    reservaData.notas || ''
                ]);
                
                // Actualizar espacios disponibles
                await client.query(`
                    UPDATE espacios_disponibles 
                    SET espacios_disponibles = espacios_disponibles - 1 
                    WHERE fecha = $1
                `, [reservaData.fecha]);
                
                await client.query('COMMIT');
                
                const nuevosEspacios = espaciosResult.rows[0].espacios_disponibles - 1;
                return {
                    id: reservaResult.rows[0].id,
                    fecha: reservaData.fecha,
                    espaciosDisponibles: nuevosEspacios
                };
                
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        },
        
        async inicializarProximosMiercoles(semanas = 12) {
            const fechas = [];
            const hoy = new Date();
            
            for (let i = 0; i < semanas; i++) {
                const fecha = new Date(hoy);
                const daysUntilWednesday = (3 - fecha.getDay() + 7) % 7;
                fecha.setDate(fecha.getDate() + daysUntilWednesday + (i * 7));
                
                if (fecha > hoy) {
                    const fechaStr = fecha.toISOString().split('T')[0];
                    await this.inicializarEspacios(fechaStr, 8);
                    fechas.push(fechaStr);
                }
            }
            
            return fechas;
        }
    };
    
} else {
    // Usar MySQL/MariaDB para desarrollo
    db = require('./database');
}

// Middleware
app.use(cors({
    origin: [
        'https://errekalde-car-wash.surge.sh',
        'http://localhost:8080',
        'http://localhost:3000',
        /^https:\/\/.*\.surge\.sh$/
    ],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// === ENDPOINTS PARA ESPACIOS ===

// Obtener espacios disponibles para una fecha específica
app.get('/api/espacios/:fecha', async (req, res) => {
    try {
        const { fecha } = req.params;
        const espacios = await db.getEspaciosByFecha(fecha);
        
        if (!espacios) {
            await db.inicializarEspacios(fecha, 8);
            res.json({ fecha, espacios: 8 });
        } else {
            const espaciosDisponibles = DB_TYPE === 'postgresql' 
                ? espacios.espacios_disponibles 
                : espacios.espacios_disponibles;
            res.json({ fecha, espacios: espaciosDisponibles });
        }
    } catch (error) {
        console.error('Error al obtener espacios:', error);
        res.status(500).json({ error: 'Error al obtener espacios disponibles' });
    }
});

// Obtener todos los espacios disponibles (para sincronización)
app.get('/api/espacios', async (req, res) => {
    try {
        const espacios = await db.getAllEspacios();
        res.json(espacios);
    } catch (error) {
        console.error('Error al obtener todos los espacios:', error);
        res.status(500).json({ error: 'Error al obtener espacios' });
    }
});

// Endpoint mejorado para sincronización con timestamp
app.get('/api/sync-espacios', async (req, res) => {
    try {
        const espacios = await db.getAllEspacios();
        res.json({
            espacios: espacios,
            timestamp: new Date().toISOString(),
            source: DB_TYPE,
            server: 'render-production'
        });
    } catch (error) {
        console.error('Error en sincronización:', error);
        res.status(500).json({ error: 'Error en sincronización' });
    }
});

// === ENDPOINTS PARA RESERVAS ===

// Crear reserva
app.post('/api/reservar', async (req, res) => {
    try {
        const reservaData = req.body;
        
        // Validaciones básicas
        if (!reservaData.fecha || !reservaData.name || !reservaData.phone) {
            return res.status(400).json({ error: 'Datos incompletos para la reserva' });
        }

        // Validar fecha (debe ser miércoles y en el futuro)
        const fecha = new Date(reservaData.fecha);
        const hoy = new Date();
        
        if (fecha <= hoy) {
            return res.status(400).json({ error: 'La fecha debe ser en el futuro' });
        }
        
        if (fecha.getDay() !== 3) {
            return res.status(400).json({ error: 'Solo se permiten reservas para miércoles' });
        }

        const resultado = await db.hacerReserva(reservaData);
        
        console.log(`✅ Reserva creada: ${resultado.id} para ${reservaData.name} el ${reservaData.fecha}`);
        
        res.json({ 
            success: true, 
            reserva: {
                id: resultado.id,
                fecha: resultado.fecha,
                ...reservaData,
                timestamp: new Date().toISOString()
            },
            espaciosDisponibles: resultado.espaciosDisponibles
        });
    } catch (error) {
        console.error('Error al procesar reserva:', error);
        
        if (error.message.includes('No hay espacios disponibles')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al procesar la reserva' });
        }
    }
});

// === ENDPOINTS DE ADMINISTRACIÓN ===

// Inicializar espacios para los próximos miércoles
app.post('/api/inicializar-espacios', async (req, res) => {
    try {
        const { semanas = 12 } = req.body;
        const fechas = await db.inicializarProximosMiercoles(semanas);
        
        console.log(`📅 Espacios inicializados para ${fechas.length} miércoles`);
        
        res.json({ 
            success: true, 
            message: `Espacios inicializados para ${fechas.length} miércoles`,
            fechas: fechas
        });
    } catch (error) {
        console.error('Error al inicializar espacios:', error);
        res.status(500).json({ error: 'Error al inicializar espacios' });
    }
});

// Endpoint de salud para verificar conexión a BD
app.get('/api/health', async (req, res) => {
    try {
        if (DB_TYPE === 'postgresql') {
            await db.query('SELECT 1');
        } else {
            await db.testConnection();
        }
        
        res.json({ 
            status: 'healthy',
            database: DB_TYPE,
            timestamp: new Date().toISOString(),
            server: 'render-production'
        });
    } catch (error) {
        console.error('Error en health check:', error);
        res.status(500).json({ 
            status: 'unhealthy', 
            error: error.message,
            database: DB_TYPE
        });
    }
});

// Inicializar servidor
async function inicializarServidor() {
    try {
        console.log(`🚀 Iniciando servidor de producción...`);
        console.log(`📊 Tipo de BD: ${DB_TYPE}`);
        console.log(`🌍 Puerto: ${PORT}`);
        
        // Verificar conexión a BD
        if (DB_TYPE === 'postgresql') {
            await db.query('SELECT 1');
            console.log('✅ Conexión a PostgreSQL establecida');
        } else {
            await db.testConnection();
            console.log('✅ Conexión a MySQL/MariaDB establecida');
        }
        
        // Inicializar espacios por defecto
        await db.inicializarProximosMiercoles(12);
        console.log('📅 Espacios inicializados para los próximos miércoles');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🎉 Servidor corriendo en puerto ${PORT}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
        });
        
    } catch (error) {
        console.error('❌ Error al inicializar servidor:', error);
        process.exit(1);
    }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Inicializar el servidor
inicializarServidor(); 