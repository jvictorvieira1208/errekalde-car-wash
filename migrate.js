// migrate.js - Script de migración de datos JSON a MySQL
const db = require('./database');
const fs = require('fs').promises;
const path = require('path');

async function crearBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `reservas_backup_${timestamp}.json`;
        
        // Leer archivo original
        const originalData = await fs.readFile('reservas.json', 'utf8');
        
        // Crear backup
        await fs.writeFile(backupName, originalData);
        
        console.log(`💾 Backup creado: ${backupName}`);
        return backupName;
    } catch (error) {
        console.error('❌ Error creando backup:', error.message);
        throw error;
    }
}

async function verificarMigracion(jsonData) {
    try {
        console.log('\n🔍 Verificando migración...');
        
        // Verificar espacios migrados
        const espaciosMigrados = await db.getAllEspacios();
        const espaciosOriginales = Object.keys(jsonData.espacios).length;
        const espaciosMysql = Object.keys(espaciosMigrados).length;
        
        console.log(`   📅 Espacios: ${espaciosMysql}/${espaciosOriginales} migrados`);
        
        // Verificar reservas migradas
        const [reservasCount] = await db.query('SELECT COUNT(*) as total FROM reservas');
        const reservasOriginales = jsonData.reservas.length;
        const reservasMysql = reservasCount.total;
        
        console.log(`   📝 Reservas: ${reservasMysql}/${reservasOriginales} migradas`);
        
        // Verificar servicios creados
        const [serviciosCount] = await db.query('SELECT COUNT(*) as total FROM servicios');
        console.log(`   🛠️ Servicios: ${serviciosCount.total} tipos creados`);
        
        // Verificar integridad de datos
        let integridadOk = true;
        
        // Comprobar algunas fechas aleatorias
        for (const [fecha, espaciosJson] of Object.entries(jsonData.espacios)) {
            const espaciosBd = await db.getEspaciosByFecha(fecha);
            if (!espaciosBd || espaciosBd.espacios_disponibles !== espaciosJson) {
                console.warn(`   ⚠️ Discrepancia en fecha ${fecha}: JSON=${espaciosJson}, BD=${espaciosBd?.espacios_disponibles || 'null'}`);
                integridadOk = false;
            }
        }
        
        if (integridadOk) {
            console.log('   ✅ Integridad de datos verificada');
        } else {
            console.warn('   ⚠️ Se detectaron algunas discrepancias en los datos');
        }
        
        return {
            espaciosOk: espaciosMysql >= espaciosOriginales,
            reservasOk: reservasMysql >= reservasOriginales,
            integridadOk
        };
        
    } catch (error) {
        console.error('❌ Error verificando migración:', error.message);
        return { espaciosOk: false, reservasOk: false, integridadOk: false };
    }
}

async function mostrarEstadisticas() {
    try {
        const stats = await db.getEstadisticas();
        
        console.log('\n📊 Estadísticas finales:');
        console.log(`   📝 Total reservas confirmadas: ${stats.totalReservas}`);
        console.log(`   📅 Espacios disponibles: ${stats.espaciosDisponibles?.total_disponibles || 0}`);
        console.log(`   🗓️ Fechas con espacios: ${stats.espaciosDisponibles?.fechas_disponibles || 0}`);
        
        if (stats.reservasPorMes && stats.reservasPorMes.length > 0) {
            console.log('\n📈 Reservas por mes:');
            stats.reservasPorMes.forEach(mes => {
                console.log(`   ${mes.mes}: ${mes.total} reservas`);
            });
        }
        
    } catch (error) {
        console.warn('⚠️ Error obteniendo estadísticas:', error.message);
    }
}

async function migrarDatos() {
    let backupCreado = null;
    
    try {
        console.log('🚀 Iniciando proceso de migración de datos...\n');
        
        // 1. Verificar conexión a base de datos
        console.log('🔌 Verificando conexión a MySQL...');
        const connectionStatus = await db.testConnection();
        console.log(`✅ Conectado a MySQL: ${connectionStatus.config.host}:${connectionStatus.config.port}`);
        console.log(`   Database: ${connectionStatus.config.database}`);
        console.log(`   User: ${connectionStatus.config.user}\n`);
        
        // 2. Verificar archivo JSON
        console.log('📖 Verificando archivo JSON...');
        const jsonExists = await fs.access('reservas.json').then(() => true).catch(() => false);
        
        if (!jsonExists) {
            throw new Error('Archivo reservas.json no encontrado');
        }
        
        const jsonData = JSON.parse(await fs.readFile('reservas.json', 'utf8'));
        console.log(`   - ${Object.keys(jsonData.espacios).length} fechas con espacios`);
        console.log(`   - ${jsonData.reservas.length} reservas`);
        
        // 3. Crear backup del JSON
        console.log('\n💾 Creando backup del archivo JSON...');
        backupCreado = await crearBackup();
        
        // 4. Verificar si ya hay datos en MySQL
        console.log('\n🔍 Verificando estado actual de MySQL...');
        const [existingReservas] = await db.query('SELECT COUNT(*) as total FROM reservas');
        const [existingEspacios] = await db.query('SELECT COUNT(*) as total FROM espacios_disponibles');
        
        if (existingReservas.total > 0 || existingEspacios.total > 0) {
            console.log(`⚠️ ADVERTENCIA: MySQL ya contiene datos:`);
            console.log(`   - ${existingReservas.total} reservas existentes`);
            console.log(`   - ${existingEspacios.total} fechas con espacios`);
            console.log('\n¿Continuar con la migración? Esto podría duplicar datos...');
            
            // En un entorno de producción, aquí habría una confirmación del usuario
            console.log('🔄 Continuando con migración (modo automático)...\n');
        }
        
        // 5. Ejecutar migración
        console.log('🔄 Ejecutando migración a MySQL...');
        await db.migrarDatosDesdeJSON(jsonData);
        
        // 6. Verificar migración
        const verificacion = await verificarMigracion(jsonData);
        
        // 7. Mostrar estadísticas
        await mostrarEstadisticas();
        
        // 8. Resultados finales
        console.log('\n🎉 ¡Migración completada!');
        
        if (verificacion.espaciosOk && verificacion.reservasOk && verificacion.integridadOk) {
            console.log('✅ Todos los datos se migraron correctamente');
            console.log(`💾 Backup disponible en: ${backupCreado}`);
            console.log('\n🚀 Próximos pasos:');
            console.log('   1. Ejecutar: node server-mysql.js');
            console.log('   2. Probar endpoint: http://localhost:3001/api/health');
            console.log('   3. Verificar sincronización: http://localhost:3001/api/sync-espacios');
            console.log('   4. Si todo funciona, puedes reemplazar server.js con server-mysql.js');
        } else {
            console.warn('⚠️ La migración completó con algunas advertencias');
            console.log('🔍 Revisa los logs anteriores para más detalles');
        }
        
    } catch (error) {
        console.error('\n❌ Error durante la migración:', error.message);
        console.error('\n🔧 Posibles soluciones:');
        console.error('   1. Verificar que MySQL/MariaDB esté corriendo');
        console.error('   2. Ejecutar: mysql -u root -p < schema.sql');
        console.error('   3. Verificar credenciales en archivo .env');
        console.error('   4. Verificar permisos del usuario de base de datos');
        
        if (backupCreado) {
            console.error(`\n💾 Backup disponible en: ${backupCreado}`);
        }
        
        console.error('\n📞 Los datos originales en reservas.json permanecen intactos');
        
    } finally {
        try {
            await db.close();
            console.log('\n🔌 Conexión a base de datos cerrada');
        } catch (error) {
            console.error('Error cerrando conexión:', error.message);
        }
    }
}

// Función para mostrar ayuda
function mostrarAyuda() {
    console.log('🚗 Script de Migración - Errekalde Car Wash');
    console.log('\nUso: node migrate.js [opciones]');
    console.log('\nOpciones:');
    console.log('  --help, -h     Mostrar esta ayuda');
    console.log('  --force, -f    Forzar migración aunque existan datos');
    console.log('  --verify, -v   Solo verificar, no migrar');
    console.log('\nEjemplos:');
    console.log('  node migrate.js           # Migración normal');
    console.log('  node migrate.js --verify  # Solo verificar conexión');
    console.log('  node migrate.js --force   # Forzar migración');
}

// Función principal
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        mostrarAyuda();
        return;
    }
    
    if (args.includes('--verify') || args.includes('-v')) {
        console.log('🔍 Modo verificación...');
        try {
            const status = await db.testConnection();
            console.log('✅ Conexión a MySQL exitosa');
            console.log(`   Host: ${status.config.host}:${status.config.port}`);
            console.log(`   Database: ${status.config.database}`);
            await mostrarEstadisticas();
        } catch (error) {
            console.error('❌ Error de conexión:', error.message);
        } finally {
            await db.close();
        }
        return;
    }
    
    await migrarDatos();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(error => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
}

module.exports = { migrarDatos, crearBackup, verificarMigracion }; 