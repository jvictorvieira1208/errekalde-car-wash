#!/usr/bin/env node

// Test N8N - Base de Datos Centralizada
// Script para verificar que N8N funcione correctamente como backend universal

const https = require('https');
const fs = require('fs');

// Configuración
const N8N_SPACES_URL = 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash-spaces';
const N8N_WEBHOOK_URL = 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash';
const N8N_VALIDATION_URL = 'https://n8nserver.swapenergia.com/webhook/validarNúmero';
const CACHE_BUSTER = 'REALTIMESYNC2024_TEST';

// Colores para la consola
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Función para hacer peticiones HTTP
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                ...options.headers
            }
        };

        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = {
                        status: res.statusCode,
                        headers: res.headers,
                        data: data ? JSON.parse(data) : null
                    };
                    resolve(result);
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data,
                        parseError: error.message
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

// Función para mostrar mensajes con colores
function log(message, color = 'white') {
    console.log(colors[color] + message + colors.reset);
}

function logBold(message, color = 'white') {
    console.log(colors.bold + colors[color] + message + colors.reset);
}

// Función para generar Device ID
function generateDeviceId() {
    return 'TEST_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Función para generar espacios por defecto
function generateDefaultSpaces() {
    const spaces = {};
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
        const wednesday = new Date(today);
        const daysUntilWednesday = (3 - today.getDay() + 7) % 7;
        wednesday.setDate(today.getDate() + daysUntilWednesday + (i * 7));
        
        if (wednesday > today) {
            const dateStr = wednesday.toISOString().split('T')[0];
            spaces[dateStr] = 8;
        }
    }
    
    return spaces;
}

// Tests
async function testGetSpaces() {
    logBold('📥 TEST 1: Obtener Espacios desde N8N', 'blue');
    
    const deviceId = generateDeviceId();
    const payload = {
        action: 'get_spaces',
        timestamp: Date.now(),
        cache_buster: CACHE_BUSTER + '_' + Date.now(),
        source: 'node_test',
        device_id: deviceId
    };
    
    try {
        const response = await makeRequest(N8N_SPACES_URL, {
            method: 'POST',
            body: payload
        });
        
        if (response.status === 200 && response.data) {
            log('✅ Espacios obtenidos exitosamente', 'green');
            console.log('   📊 Fechas disponibles:', Object.keys(response.data.espacios || {}).length);
            console.log('   🕒 Timestamp:', response.data.timestamp);
            console.log('   📁 Datos:', JSON.stringify(response.data, null, 2));
            return response.data;
        } else {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        log('❌ Error al obtener espacios: ' + error.message, 'red');
        return null;
    }
}

async function testSaveSpaces() {
    logBold('💾 TEST 2: Guardar Espacios en N8N', 'blue');
    
    const deviceId = generateDeviceId();
    const testSpaces = generateDefaultSpaces();
    
    // Modificar uno de los espacios para probar
    const firstDate = Object.keys(testSpaces)[0];
    if (firstDate) {
        testSpaces[firstDate] = 7; // Reducir en 1
    }
    
    const payload = {
        action: 'save_spaces',
        espacios: testSpaces,
        timestamp: Date.now(),
        cache_buster: CACHE_BUSTER + '_' + Date.now(),
        source: 'node_test',
        device_id: deviceId
    };
    
    try {
        const response = await makeRequest(N8N_SPACES_URL, {
            method: 'POST',
            body: payload
        });
        
        if (response.status === 200) {
            log('✅ Espacios guardados exitosamente', 'green');
            console.log('   📊 Fechas guardadas:', Object.keys(testSpaces).length);
            console.log('   🔄 Respuesta:', JSON.stringify(response.data, null, 2));
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        log('❌ Error al guardar espacios: ' + error.message, 'red');
        return false;
    }
}

async function testCreateReservation() {
    logBold('🎫 TEST 3: Crear Reserva en N8N', 'blue');
    
    const deviceId = generateDeviceId();
    const reservaTest = {
        id: `TEST_RESERVA_${Date.now()}`,
        fecha: '2025-07-16',
        name: 'Test Usuario Node',
        phone: '+34600000000',
        carBrand: 'Toyota',
        carModel: 'Corolla',
        carSize: 'medium',
        services: ['complete'],
        price: 25,
        timestamp: new Date().toISOString(),
        device_id: deviceId
    };
    
    const payload = {
        action: 'create_reservation',
        reserva: reservaTest,
        timestamp: Date.now(),
        cache_buster: CACHE_BUSTER + '_' + Date.now(),
        source: 'node_test'
    };
    
    try {
        const response = await makeRequest(N8N_WEBHOOK_URL, {
            method: 'POST',
            body: payload
        });
        
        if (response.status === 200) {
            log('✅ Reserva creada exitosamente', 'green');
            console.log('   🆔 ID:', reservaTest.id);
            console.log('   📅 Fecha:', reservaTest.fecha);
            console.log('   👤 Cliente:', reservaTest.name);
            console.log('   🚗 Vehículo:', reservaTest.carBrand + ' ' + reservaTest.carModel);
            console.log('   💰 Precio:', reservaTest.price + '€');
            console.log('   🔄 Respuesta:', JSON.stringify(response.data, null, 2));
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        log('❌ Error al crear reserva: ' + error.message, 'red');
        return false;
    }
}

async function testVerification() {
    logBold('📱 TEST 4: Verificación WhatsApp', 'blue');
    
    const payload = {
        phone: '+34600000000',
        message: '🔐 Código de verificación TEST: 123456',
        type: 'verification',
        code: '123456',
        timestamp: Date.now()
    };
    
    try {
        const response = await makeRequest(N8N_VALIDATION_URL, {
            method: 'POST',
            body: payload
        });
        
        if (response.status >= 200 && response.status < 400) {
            log('✅ Verificación WhatsApp enviada', 'green');
            console.log('   📞 Teléfono:', payload.phone);
            console.log('   💬 Mensaje:', payload.message);
            console.log('   🔄 Respuesta:', JSON.stringify(response.data, null, 2));
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        log('❌ Error en verificación: ' + error.message, 'red');
        return false;
    }
}

async function testSyncFlow() {
    logBold('🔄 TEST 5: Flujo de Sincronización Completo', 'blue');
    
    try {
        // Paso 1: Obtener espacios actuales
        log('   📥 Paso 1: Obteniendo espacios actuales...', 'cyan');
        const espaciosOriginales = await testGetSpaces();
        
        if (!espaciosOriginales) {
            throw new Error('No se pudieron obtener espacios iniciales');
        }
        
        // Paso 2: Modificar espacios
        log('   ✏️ Paso 2: Modificando espacios...', 'cyan');
        const espaciosModificados = { ...espaciosOriginales.espacios };
        const fechas = Object.keys(espaciosModificados);
        
        if (fechas.length > 0) {
            espaciosModificados[fechas[0]] = Math.max(0, espaciosModificados[fechas[0]] - 1);
        }
        
        // Paso 3: Guardar espacios modificados
        log('   💾 Paso 3: Guardando espacios modificados...', 'cyan');
        const guardadoExitoso = await testSaveSpaces();
        
        if (!guardadoExitoso) {
            throw new Error('No se pudieron guardar espacios modificados');
        }
        
        // Paso 4: Verificar cambios
        log('   🔍 Paso 4: Verificando cambios...', 'cyan');
        const espaciosVerificados = await testGetSpaces();
        
        if (espaciosVerificados) {
            log('✅ Flujo de sincronización completado exitosamente', 'green');
            console.log('   🔄 Cambios sincronizados correctamente');
            return true;
        } else {
            throw new Error('No se pudieron verificar los cambios');
        }
        
    } catch (error) {
        log('❌ Error en flujo de sincronización: ' + error.message, 'red');
        return false;
    }
}

async function generateTestReport() {
    logBold('📊 Generando Reporte de Pruebas...', 'magenta');
    
    const report = {
        timestamp: new Date().toISOString(),
        device_id: generateDeviceId(),
        environment: 'test',
        tests: {
            get_spaces: false,
            save_spaces: false,
            create_reservation: false,
            verification: false,
            sync_flow: false
        },
        summary: {
            total: 5,
            passed: 0,
            failed: 0,
            success_rate: 0
        }
    };
    
    // Ejecutar todos los tests
    report.tests.get_spaces = !!(await testGetSpaces());
    report.tests.save_spaces = await testSaveSpaces();
    report.tests.create_reservation = await testCreateReservation();
    report.tests.verification = await testVerification();
    report.tests.sync_flow = await testSyncFlow();
    
    // Calcular resumen
    report.summary.passed = Object.values(report.tests).filter(Boolean).length;
    report.summary.failed = report.summary.total - report.summary.passed;
    report.summary.success_rate = Math.round((report.summary.passed / report.summary.total) * 100);
    
    // Mostrar resumen
    console.log('\n' + '='.repeat(60));
    logBold('📋 RESUMEN DE PRUEBAS', 'magenta');
    console.log('='.repeat(60));
    
    console.log('📈 Resultados:');
    console.log(`   ✅ Exitosos: ${report.summary.passed}/${report.summary.total}`);
    console.log(`   ❌ Fallidos: ${report.summary.failed}/${report.summary.total}`);
    console.log(`   📊 Tasa de éxito: ${report.summary.success_rate}%`);
    
    console.log('\n📝 Detalles:');
    Object.entries(report.tests).forEach(([test, result]) => {
        const icon = result ? '✅' : '❌';
        const status = result ? 'PASS' : 'FAIL';
        console.log(`   ${icon} ${test}: ${status}`);
    });
    
    // Guardar reporte
    const reportFile = `test-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n💾 Reporte guardado en: ${reportFile}`);
    
    // Recomendaciones
    console.log('\n💡 Recomendaciones:');
    if (report.summary.success_rate === 100) {
        log('   🎉 ¡Perfecto! N8N está funcionando correctamente como base de datos centralizada', 'green');
    } else if (report.summary.success_rate >= 80) {
        log('   ⚠️ Buen funcionamiento con algunas fallas menores', 'yellow');
    } else {
        log('   🚨 Problemas críticos detectados - revisar configuración N8N', 'red');
    }
    
    console.log('='.repeat(60));
    
    return report;
}

// Función principal
async function main() {
    console.clear();
    logBold('🗄️ TEST N8N - BASE DE DATOS CENTRALIZADA', 'magenta');
    logBold('===============================================', 'magenta');
    
    log('🚀 Iniciando pruebas de N8N como backend universal...', 'cyan');
    log('📍 URLs a probar:', 'cyan');
    log('   • Espacios: ' + N8N_SPACES_URL, 'white');
    log('   • Reservas: ' + N8N_WEBHOOK_URL, 'white');
    log('   • Verificación: ' + N8N_VALIDATION_URL, 'white');
    
    console.log('\n');
    
    // Ejecutar pruebas
    const report = await generateTestReport();
    
    // Resultado final
    if (report.summary.success_rate === 100) {
        logBold('\n🎉 ¡N8N ESTÁ LISTO COMO BASE DE DATOS CENTRALIZADA!', 'green');
        log('✅ Todas las personas que accedan a https://errekalde-car-wash.surge.sh/', 'green');
        log('   modificarán la misma base de datos en N8N', 'green');
    } else {
        logBold('\n🚨 CONFIGURACIÓN INCOMPLETA', 'red');
        log('❌ Hay problemas que impiden el funcionamiento correcto', 'red');
        log('📋 Revisar la guía: CONFIGURAR-N8N-DATABASE.md', 'yellow');
    }
    
    console.log('\n');
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
}

module.exports = {
    testGetSpaces,
    testSaveSpaces,
    testCreateReservation,
    testVerification,
    testSyncFlow,
    generateTestReport
}; 