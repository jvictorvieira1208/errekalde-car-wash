// database.js - Gestión de Base de Datos MySQL/MariaDB para Errekalde Car Wash
require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración de base de datos (con fallbacks para desarrollo)
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'errekalde_car_wash',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4'
};

// Pool de conexiones para mejor rendimiento
const pool = mysql.createPool(DB_CONFIG);

// Clase para gestión de base de datos
class DatabaseManager {
    constructor() {
        this.pool = pool;
    }

    // Obtener conexión del pool
    async getConnection() {
        return await this.pool.getConnection();
    }

    // Ejecutar query con manejo de errores
    async query(sql, params = []) {
        const connection = await this.getConnection();
        try {
            const [results] = await connection.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Error en query:', error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Transacción segura
    async transaction(callback) {
        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            console.error('Error en transacción:', error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    // === MÉTODOS PARA ESPACIOS ===

    // Obtener espacios disponibles para una fecha
    async getEspaciosByFecha(fecha) {
        const sql = `
            SELECT fecha, espacios_disponibles, espacios_totales 
            FROM espacios_disponibles 
            WHERE fecha = ?
        `;
        const results = await this.query(sql, [fecha]);
        return results.length > 0 ? results[0] : null;
    }

    // Obtener todos los espacios disponibles
    async getAllEspacios() {
        const sql = `
            SELECT fecha, espacios_disponibles, espacios_totales 
            FROM espacios_disponibles 
            WHERE fecha >= CURDATE()
            ORDER BY fecha ASC
        `;
        const results = await this.query(sql);
        
        // Convertir a formato compatible con sistema actual
        const espacios = {};
        results.forEach(row => {
            espacios[row.fecha] = row.espacios_disponibles;
        });
        return espacios;
    }

    // Inicializar espacios para una fecha
    async inicializarEspacios(fecha, espaciosTotales = 8) {
        const sql = `
            INSERT INTO espacios_disponibles (fecha, espacios_totales, espacios_disponibles)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
            espacios_totales = VALUES(espacios_totales)
        `;
        return await this.query(sql, [fecha, espaciosTotales, espaciosTotales]);
    }

    // === MÉTODOS PARA RESERVAS ===

    // Hacer una reserva con transacción atómica
    async hacerReserva(reservaData) {
        return await this.transaction(async (connection) => {
            // 1. Verificar espacios disponibles
            const [espacios] = await connection.execute(
                'SELECT espacios_disponibles FROM espacios_disponibles WHERE fecha = ? FOR UPDATE',
                [reservaData.fecha]
            );

            if (espacios.length === 0) {
                // Si no existe la fecha, inicializarla
                await connection.execute(
                    'INSERT INTO espacios_disponibles (fecha, espacios_totales, espacios_disponibles) VALUES (?, 8, 8)',
                    [reservaData.fecha]
                );
                
                // Volver a obtener los espacios
                const [nuevosEspacios] = await connection.execute(
                    'SELECT espacios_disponibles FROM espacios_disponibles WHERE fecha = ? FOR UPDATE',
                    [reservaData.fecha]
                );
                espacios.push(nuevosEspacios[0]);
            }

            if (espacios[0].espacios_disponibles <= 0) {
                throw new Error('No hay espacios disponibles para esta fecha');
            }

            // 2. Crear la reserva
            const reservationId = Date.now().toString();
            const [reservaResult] = await connection.execute(
                `INSERT INTO reservas 
                (reservation_id, fecha, name, phone, car_brand, car_model, car_size, price, notas)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    reservationId,
                    reservaData.fecha,
                    reservaData.name,
                    reservaData.phone,
                    reservaData.carBrand,
                    reservaData.carModel,
                    reservaData.carSize,
                    reservaData.price,
                    reservaData.notas || null
                ]
            );

            const reservaId = reservaResult.insertId;

            // 3. Agregar servicios de la reserva
            if (reservaData.services && reservaData.services.length > 0) {
                for (let i = 0; i < reservaData.services.length; i++) {
                    const serviceCode = reservaData.services[i];
                    const serviceName = reservaData.serviceNames[i];
                    
                    // Obtener o crear servicio
                    let [servicio] = await connection.execute(
                        'SELECT id FROM servicios WHERE service_code = ?',
                        [serviceCode]
                    );

                    if (servicio.length === 0) {
                        // Crear servicio si no existe
                        const [servicioResult] = await connection.execute(
                            'INSERT INTO servicios (service_code, service_name, base_price) VALUES (?, ?, ?)',
                            [serviceCode, serviceName, 0] // Precio base 0, se calculará dinámicamente
                        );
                        servicio = [{ id: servicioResult.insertId }];
                    }

                    // Asociar servicio con reserva
                    await connection.execute(
                        'INSERT INTO reserva_servicios (reserva_id, servicio_id, price_applied) VALUES (?, ?, ?)',
                        [reservaId, servicio[0].id, reservaData.price] // Precio total por ahora
                    );
                }
            }

            // 4. Reducir espacios disponibles
            const espaciosAnteriores = espacios[0].espacios_disponibles;
            const nuevosEspacios = espaciosAnteriores - 1;

            await connection.execute(
                'UPDATE espacios_disponibles SET espacios_disponibles = ? WHERE fecha = ?',
                [nuevosEspacios, reservaData.fecha]
            );

            // 5. Auditoría
            await connection.execute(
                `INSERT INTO espacios_audit 
                (fecha, espacios_antes, espacios_despues, accion, reserva_id, detalles)
                VALUES (?, ?, ?, 'reserva', ?, ?)`,
                [
                    reservaData.fecha, 
                    espaciosAnteriores, 
                    nuevosEspacios, 
                    reservaId,
                    `Reserva creada para ${reservaData.name} - ${reservaData.carBrand} ${reservaData.carModel}`
                ]
            );

            return {
                id: reservationId,
                reservaId: reservaId,
                espaciosDisponibles: nuevosEspacios,
                fecha: reservaData.fecha
            };
        });
    }

    // Cancelar una reserva
    async cancelarReserva(reservationId) {
        return await this.transaction(async (connection) => {
            // 1. Obtener información de la reserva
            const [reserva] = await connection.execute(
                'SELECT id, fecha, name FROM reservas WHERE reservation_id = ? AND status = "confirmed"',
                [reservationId]
            );

            if (reserva.length === 0) {
                throw new Error('Reserva no encontrada o ya cancelada');
            }

            // 2. Cancelar la reserva
            await connection.execute(
                'UPDATE reservas SET status = "cancelled" WHERE reservation_id = ?',
                [reservationId]
            );

            // 3. Aumentar espacios disponibles
            const [espacios] = await connection.execute(
                'SELECT espacios_disponibles FROM espacios_disponibles WHERE fecha = ?',
                [reserva[0].fecha]
            );

            const espaciosAnteriores = espacios[0].espacios_disponibles;
            const nuevosEspacios = espaciosAnteriores + 1;

            await connection.execute(
                'UPDATE espacios_disponibles SET espacios_disponibles = ? WHERE fecha = ?',
                [nuevosEspacios, reserva[0].fecha]
            );

            // 4. Auditoría
            await connection.execute(
                `INSERT INTO espacios_audit 
                (fecha, espacios_antes, espacios_despues, accion, reserva_id, detalles)
                VALUES (?, ?, ?, 'cancelacion', ?, ?)`,
                [
                    reserva[0].fecha, 
                    espaciosAnteriores, 
                    nuevosEspacios, 
                    reserva[0].id,
                    `Reserva cancelada para ${reserva[0].name}`
                ]
            );

            return { espaciosDisponibles: nuevosEspacios };
        });
    }

    // Obtener reservas por fecha
    async getReservasByFecha(fecha) {
        const sql = `
            SELECT r.*, 
                   GROUP_CONCAT(s.service_name) as servicios,
                   GROUP_CONCAT(s.service_code) as service_codes
            FROM reservas r
            LEFT JOIN reserva_servicios rs ON r.id = rs.reserva_id
            LEFT JOIN servicios s ON rs.servicio_id = s.id
            WHERE r.fecha = ? AND r.status = 'confirmed'
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `;
        return await this.query(sql, [fecha]);
    }

    // === MÉTODOS DE INICIALIZACIÓN ===

    // Inicializar espacios para los próximos miércoles
    async inicializarProximosMiercoles(semanas = 12) {
        const hoy = new Date();
        const fechas = [];

        for (let i = 0; i < semanas; i++) {
            const fecha = new Date(hoy);
            const daysUntilWednesday = (3 - fecha.getDay() + 7) % 7;
            fecha.setDate(fecha.getDate() + daysUntilWednesday + (i * 7));

            if (fecha > hoy) {
                const fechaStr = fecha.toISOString().split('T')[0];
                fechas.push(fechaStr);
                
                try {
                    await this.inicializarEspacios(fechaStr, 8);
                    console.log(`✅ Inicializado ${fechaStr} con 8 espacios`);
                } catch (error) {
                    console.warn(`⚠️ Error inicializando ${fechaStr}:`, error.message);
                }
            }
        }

        return fechas;
    }

    // Método para migrar datos del JSON existente
    async migrarDatosDesdeJSON(jsonData) {
        return await this.transaction(async (connection) => {
            console.log('🔄 Iniciando migración de datos...');

            // 1. Migrar espacios
            for (const [fecha, espacios] of Object.entries(jsonData.espacios)) {
                await connection.execute(
                    `INSERT INTO espacios_disponibles (fecha, espacios_totales, espacios_disponibles)
                     VALUES (?, 8, ?)
                     ON DUPLICATE KEY UPDATE espacios_disponibles = VALUES(espacios_disponibles)`,
                    [fecha, espacios]
                );
                
                // Auditoría de inicialización
                await connection.execute(
                    `INSERT INTO espacios_audit 
                    (fecha, espacios_antes, espacios_despues, accion, detalles)
                    VALUES (?, 0, ?, 'inicializacion', ?)`,
                    [fecha, espacios, `Migración desde JSON - ${espacios} espacios disponibles`]
                );
            }
            console.log(`✅ Migrados ${Object.keys(jsonData.espacios).length} registros de espacios`);

            // 2. Migrar reservas
            for (const reserva of jsonData.reservas) {
                const [reservaResult] = await connection.execute(
                    `INSERT INTO reservas 
                    (reservation_id, fecha, name, phone, car_brand, car_model, car_size, price, notas, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        reserva.id,
                        reserva.fecha,
                        reserva.name,
                        reserva.phone,
                        reserva.carBrand,
                        reserva.carModel,
                        reserva.carSize,
                        reserva.price,
                        reserva.notas || null,
                        reserva.timestamp
                    ]
                );

                const reservaId = reservaResult.insertId;

                // 3. Migrar servicios de la reserva
                if (reserva.services && reserva.services.length > 0) {
                    for (let i = 0; i < reserva.services.length; i++) {
                        const serviceCode = reserva.services[i];
                        const serviceName = reserva.serviceNames[i];
                        
                        // Obtener o crear servicio
                        let [servicio] = await connection.execute(
                            'SELECT id FROM servicios WHERE service_code = ?',
                            [serviceCode]
                        );

                        if (servicio.length === 0) {
                            const [servicioResult] = await connection.execute(
                                'INSERT INTO servicios (service_code, service_name, base_price) VALUES (?, ?, ?)',
                                [serviceCode, serviceName, 0]
                            );
                            servicio = [{ id: servicioResult.insertId }];
                        }

                        await connection.execute(
                            'INSERT INTO reserva_servicios (reserva_id, servicio_id, price_applied) VALUES (?, ?, ?)',
                            [reservaId, servicio[0].id, reserva.price]
                        );
                    }
                }
            }
            console.log(`✅ Migradas ${jsonData.reservas.length} reservas`);
            console.log('🎉 Migración completada exitosamente');
        });
    }

    // Verificar estado de la conexión
    async testConnection() {
        try {
            const result = await this.query('SELECT 1 as connected, NOW() as timestamp');
            return { 
                status: 'connected', 
                timestamp: result[0].timestamp,
                config: {
                    host: DB_CONFIG.host,
                    port: DB_CONFIG.port,
                    database: DB_CONFIG.database,
                    user: DB_CONFIG.user
                }
            };
        } catch (error) {
            throw new Error(`Error de conexión: ${error.message}`);
        }
    }

    // Cerrar pool de conexiones
    async close() {
        await this.pool.end();
        console.log('🔌 Pool de conexiones cerrado');
    }

    // Estadísticas de la base de datos
    async getEstadisticas() {
        const stats = {};
        
        // Total de reservas
        const [totalReservas] = await this.query('SELECT COUNT(*) as total FROM reservas WHERE status = "confirmed"');
        stats.totalReservas = totalReservas.total;
        
        // Reservas por mes
        const reservasPorMes = await this.query(`
            SELECT DATE_FORMAT(fecha, '%Y-%m') as mes, COUNT(*) as total 
            FROM reservas 
            WHERE status = 'confirmed' 
            GROUP BY mes 
            ORDER BY mes DESC 
            LIMIT 6
        `);
        stats.reservasPorMes = reservasPorMes;
        
        // Espacios totales disponibles
        const [espaciosTotales] = await this.query(`
            SELECT SUM(espacios_disponibles) as total_disponibles, 
                   COUNT(*) as fechas_disponibles 
            FROM espacios_disponibles 
            WHERE fecha >= CURDATE()
        `);
        stats.espaciosDisponibles = espaciosTotales;
        
        return stats;
    }
}

// Exportar instancia singleton
const db = new DatabaseManager();
module.exports = db; 