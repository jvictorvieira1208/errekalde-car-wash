// test-mysql.js - Pruebas rápidas de la implementación MySQL
const db = require('./database');

// Colores para output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
    try {
        log('blue', '\n🔌 Probando conexión a MySQL...');
        const status = await db.testConnection();
        log('green', `✅ Conexión exitosa`);
        log('blue', `   Host: ${status.config.host}:${status.config.port}`);
        log('blue', `   Database: ${status.config.database}`);
        log('blue', `   User: ${status.config.user}`);
        return true;
    } catch (error) {
        log('red', `❌ Error de conexión: ${error.message}`);
        return false;
    }
}

async function testTables() {
    try {
        log('blue', '\n🗄️ Verificando tablas...');
        
        const tables = await db.query("SHOW TABLES");
        const expectedTables = ['espacios_disponibles', 'reservas', 'servicios', 'reserva_servicios', 'espacios_audit'];
        
        log('blue', `   Tablas encontradas: ${tables.length}`);
        
        for (const expectedTable of expectedTables) {
            const found = tables.find(table => Object.values(table)[0] === expectedTable);
            if (found) {
                log('green', `   ✅ ${expectedTable}`);
            } else {
                log('red', `   ❌ ${expectedTable} - NO ENCONTRADA`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        log('red', `❌ Error verificando tablas: ${error.message}`);
        return false;
    }
}

async function testBasicOperations() {
    try {
        log('blue', '\n⚡ Probando operaciones básicas...');
        
        // 1. Inicializar espacios
        const fecha = '2025-12-25'; // Fecha de prueba
        await db.inicializarEspacios(fecha, 8);
        log('green', `   ✅ Espacios inicializados para ${fecha}`);
        
        // 2. Obtener espacios
        const espacios = await db.getEspaciosByFecha(fecha);
        if (espacios && espacios.espacios_disponibles === 8) {
            log('green', `   ✅ Espacios obtenidos: ${espacios.espacios_disponibles}/8`);
        } else {
            log('red', `   ❌ Error obteniendo espacios`);
            return false;
        }
        
        // 3. Crear reserva de prueba
        const reservaData = {
            fecha: fecha,
            name: 'Test Usuario',
            phone: '+34600000000',
            carBrand: 'Toyota',
            carModel: 'Corolla',
            carSize: 'medium',
            services: ['complete'],
            serviceNames: ['Limpieza Completa'],
            price: 40,
            notas: 'Reserva de prueba'
        };
        
        const resultado = await db.hacerReserva(reservaData);
        if (resultado && resultado.espaciosDisponibles === 7) {
            log('green', `   ✅ Reserva creada: ${resultado.id}`);
            log('green', `   ✅ Espacios reducidos a: ${resultado.espaciosDisponibles}/8`);
        } else {
            log('red', `   ❌ Error creando reserva`);
            return false;
        }
        
        // 4. Verificar reserva
        const reservas = await db.getReservasByFecha(fecha);
        if (reservas && reservas.length > 0) {
            log('green', `   ✅ Reserva verificada en BD`);
        } else {
            log('red', `   ❌ Error verificando reserva`);
            return false;
        }
        
        // 5. Cancelar reserva
        await db.cancelarReserva(resultado.id);
        const espaciosDespues = await db.getEspaciosByFecha(fecha);
        if (espaciosDespues.espacios_disponibles === 8) {
            log('green', `   ✅ Reserva cancelada, espacios restaurados: ${espaciosDespues.espacios_disponibles}/8`);
        } else {
            log('red', `   ❌ Error cancelando reserva`);
            return false;
        }
        
        // 6. Limpiar datos de prueba
        await db.query('DELETE FROM reservas WHERE fecha = ?', [fecha]);
        await db.query('DELETE FROM espacios_disponibles WHERE fecha = ?', [fecha]);
        log('blue', `   🧹 Datos de prueba eliminados`);
        
        return true;
    } catch (error) {
        log('red', `❌ Error en operaciones básicas: ${error.message}`);
        return false;
    }
}

async function testStatistics() {
    try {
        log('blue', '\n📊 Probando estadísticas...');
        const stats = await db.getEstadisticas();
        
        log('green', `   ✅ Total reservas: ${stats.totalReservas}`);
        log('green', `   ✅ Espacios disponibles: ${stats.espaciosDisponibles?.total_disponibles || 0}`);
        log('green', `   ✅ Fechas disponibles: ${stats.espaciosDisponibles?.fechas_disponibles || 0}`);
        
        if (stats.reservasPorMes && stats.reservasPorMes.length > 0) {
            log('green', `   ✅ Estadísticas por mes disponibles`);
        }
        
        return true;
    } catch (error) {
        log('red', `❌ Error obteniendo estadísticas: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    log('bold', '🚗 ERREKALDE CAR WASH - PRUEBAS MYSQL/MARIADB');
    log('bold', '='.repeat(50));
    
    const tests = [
        { name: 'Conexión', fn: testConnection },
        { name: 'Tablas', fn: testTables },
        { name: 'Operaciones Básicas', fn: testBasicOperations },
        { name: 'Estadísticas', fn: testStatistics }
    ];
    
    let passedTests = 0;
    
    for (const test of tests) {
        const result = await test.fn();
        if (result) {
            passedTests++;
        }
    }
    
    log('bold', '\n' + '='.repeat(50));
    
    if (passedTests === tests.length) {
        log('green', `🎉 TODAS LAS PRUEBAS EXITOSAS (${passedTests}/${tests.length})`);
        log('green', '\n✅ Tu implementación MySQL está funcionando correctamente');
        log('blue', '\n🚀 Próximos pasos:');
        log('blue', '   1. Ejecutar: node server-mysql.js');
        log('blue', '   2. Probar: http://localhost:3001/api/health');
        log('blue', '   3. Si todo funciona, reemplazar server.js');
        log('blue', '   4. Migrar datos: node migrate.js');
    } else {
        log('red', `❌ ALGUNAS PRUEBAS FALLARON (${passedTests}/${tests.length})`);
        log('yellow', '\n🔧 Verifica:');
        log('yellow', '   1. MySQL/MariaDB está corriendo');
        log('yellow', '   2. Base de datos existe');
        log('yellow', '   3. Usuario tiene permisos');
        log('yellow', '   4. Credenciales en .env son correctas');
    }
    
    return passedTests === tests.length;
}

// Función para mostrar ayuda
function showHelp() {
    log('bold', '🚗 ERREKALDE CAR WASH - PRUEBAS MYSQL');
    log('blue', '\nUso: node test-mysql.js [opciones]');
    log('blue', '\nOpciones:');
    log('blue', '  --help, -h        Mostrar esta ayuda');
    log('blue', '  --connection, -c  Solo probar conexión');
    log('blue', '  --tables, -t      Solo verificar tablas');
    log('blue', '  --operations, -o  Solo probar operaciones');
    log('blue', '  --stats, -s       Solo probar estadísticas');
    log('blue', '\nEjemplos:');
    log('blue', '  node test-mysql.js           # Ejecutar todas las pruebas');
    log('blue', '  node test-mysql.js -c        # Solo conexión');
    log('blue', '  node test-mysql.js -t        # Solo tablas');
}

// Función principal
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }
    
    try {
        if (args.includes('--connection') || args.includes('-c')) {
            await testConnection();
        } else if (args.includes('--tables') || args.includes('-t')) {
            await testTables();
        } else if (args.includes('--operations') || args.includes('-o')) {
            await testBasicOperations();
        } else if (args.includes('--stats') || args.includes('-s')) {
            await testStatistics();
        } else {
            await runAllTests();
        }
    } catch (error) {
        log('red', `❌ Error fatal: ${error.message}`);
    } finally {
        await db.close();
        log('blue', '\n🔌 Conexión cerrada');
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(error => {
        console.error('Error ejecutando pruebas:', error);
        process.exit(1);
    });
}

module.exports = { runAllTests, testConnection, testTables, testBasicOperations, testStatistics }; 