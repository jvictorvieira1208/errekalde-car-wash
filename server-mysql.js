// server-mysql.js - Servidor Errekalde Car Wash con MySQL/MariaDB
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
            // Si no existe la fecha, inicializarla
            await db.inicializarEspacios(fecha, 8);
            res.json({ fecha, espacios: 8 });
        } else {
            res.json({ fecha, espacios: espacios.espacios_disponibles });
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
            source: 'mysql',
            database: 'connected'
        });
    } catch (error) {
        console.error('Error en sincronización:', error);
        res.status(500).json({ error: 'Error en sincronización' });
    }
});

// === ENDPOINTS PARA RESERVAS ===

// Hacer una reserva
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

// Cancelar una reserva
app.delete('/api/reservar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await db.cancelarReserva(id);
        
        console.log(`🗑️ Reserva cancelada: ${id}`);
        
        res.json({ 
            success: true,
            espaciosDisponibles: resultado.espaciosDisponibles
        });
    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        
        if (error.message.includes('no encontrada')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al cancelar la reserva' });
        }
    }
});

// Obtener reservas por fecha
app.get('/api/reservas/:fecha', async (req, res) => {
    try {
        const { fecha } = req.params;
        const reservas = await db.getReservasByFecha(fecha);
        res.json(reservas);
    } catch (error) {
        console.error('Error al obtener reservas:', error);
        res.status(500).json({ error: 'Error al obtener reservas' });
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

// Migrar datos desde JSON existente
app.post('/api/migrar-datos', async (req, res) => {
    try {
        console.log('🔄 Iniciando migración desde JSON...');
        
        // Leer datos del archivo JSON existente
        const jsonData = JSON.parse(await fs.readFile('reservas.json', 'utf8'));
        
        await db.migrarDatosDesdeJSON(jsonData);
        
        console.log('✅ Migración completada exitosamente');
        
        res.json({ 
            success: true, 
            message: 'Datos migrados exitosamente desde JSON a MySQL',
            espaciosMigrados: Object.keys(jsonData.espacios).length,
            reservasMigradas: jsonData.reservas.length
        });
    } catch (error) {
        console.error('Error en migración:', error);
        res.status(500).json({ error: 'Error al migrar datos: ' + error.message });
    }
});

// Endpoint de salud para verificar conexión a BD
app.get('/api/health', async (req, res) => {
    try {
        const connectionStatus = await db.testConnection();
        const stats = await db.getEstadisticas();
        
        res.json({ 
            status: 'ok', 
            database: connectionStatus.status,
            timestamp: connectionStatus.timestamp,
            config: connectionStatus.config,
            statistics: stats
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            database: 'disconnected',
            error: error.message
        });
    }
});

// Endpoint para estadísticas detalladas
app.get('/api/estadisticas', async (req, res) => {
    try {
        const stats = await db.getEstadisticas();
        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// === MANEJO DE ERRORES ===

// Middleware de manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no capturado:', error);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
    });
});

// Ruta por defecto
app.get('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// === INICIALIZACIÓN DEL SERVIDOR ===

async function inicializarServidor() {
    try {
        console.log('🚗 Iniciando servidor Errekalde Car Wash...');
        console.log(`📊 Base de datos: MySQL/MariaDB`);
        
        // Verificar conexión a base de datos
        const connectionStatus = await db.testConnection();
        console.log('✅ Conexión a base de datos establecida');
        console.log(`   Host: ${connectionStatus.config.host}:${connectionStatus.config.port}`);
        console.log(`   Database: ${connectionStatus.config.database}`);
        console.log(`   User: ${connectionStatus.config.user}`);
        
        // Inicializar espacios automáticamente
        try {
            const fechas = await db.inicializarProximosMiercoles();
            console.log(`✅ Espacios inicializados para ${fechas.length} miércoles`);
        } catch (initError) {
            console.warn('⚠️ Error inicializando espacios automáticamente:', initError.message);
        }
        
        // Obtener estadísticas iniciales
        try {
            const stats = await db.getEstadisticas();
            console.log(`📊 Estadísticas actuales:`);
            console.log(`   - Reservas confirmadas: ${stats.totalReservas}`);
            console.log(`   - Espacios disponibles: ${stats.espaciosDisponibles?.total_disponibles || 0}`);
            console.log(`   - Fechas disponibles: ${stats.espaciosDisponibles?.fechas_disponibles || 0}`);
        } catch (statsError) {
            console.warn('⚠️ Error obteniendo estadísticas:', statsError.message);
        }
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`\n🎉 Servidor corriendo exitosamente!`);
            console.log(`🌐 URL: http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
            console.log(`📊 Estadísticas: http://localhost:${PORT}/api/estadisticas`);
            console.log(`\n🔄 Endpoints disponibles:`);
            console.log(`   GET  /api/sync-espacios - Sincronización global`);
            console.log(`   GET  /api/espacios/:fecha - Espacios por fecha`);
            console.log(`   POST /api/reservar - Crear reserva`);
            console.log(`   DELETE /api/reservar/:id - Cancelar reserva`);
            console.log(`   POST /api/migrar-datos - Migrar desde JSON`);
            console.log(`\n✅ Sistema listo para recibir conexiones!`);
        });
        
    } catch (error) {
        console.error('❌ Error crítico inicializando servidor:', error);
        console.error('\n🔧 Verificaciones necesarias:');
        console.error('   1. MySQL/MariaDB está corriendo');
        console.error('   2. Base de datos "errekalde_car_wash" existe');
        console.error('   3. Usuario "errekalde_user" tiene permisos');
        console.error('   4. Credenciales en archivo .env son correctas');
        console.error('\n💡 Ejecuta: mysql -u root -p < schema.sql');
        process.exit(1);
    }
}

// Manejo de cierre graceful
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando servidor...');
    try {
        await db.close();
        console.log('✅ Conexiones de base de datos cerradas');
    } catch (error) {
        console.error('❌ Error cerrando conexiones:', error);
    }
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Cerrando servidor (SIGTERM)...');
    await db.close();
    process.exit(0);
});

// Inicializar servidor
inicializarServidor();

module.exports = app; 