const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Archivo de datos
const DATA_FILE = 'reservas.json';

// Función para leer datos
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe, crear estructura inicial
        const initialData = {
            espacios: {},
            reservas: []
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
}

// Función para escribir datos
async function writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Función para obtener espacios disponibles para una fecha
function getAvailableSpaces(dateStr) {
    const data = require('./reservas.json');
    return data.espacios[dateStr] || 8;
}

// Función para actualizar espacios disponibles
async function updateAvailableSpaces(dateStr, newCount) {
    const data = await readData();
    data.espacios[dateStr] = Math.max(0, newCount);
    await writeData(data);
    return data.espacios[dateStr];
}

// Endpoint para obtener espacios disponibles
app.get('/api/espacios/:fecha', async (req, res) => {
    try {
        const { fecha } = req.params;
        const espacios = getAvailableSpaces(fecha);
        res.json({ fecha, espacios });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener espacios disponibles' });
    }
});

// Endpoint para obtener todos los espacios
app.get('/api/espacios', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.espacios);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener espacios' });
    }
});

// Endpoint para hacer una reserva
app.post('/api/reservar', async (req, res) => {
    try {
        const { fecha, ...reservaData } = req.body;
        const data = await readData();
        
        // Verificar si hay espacios disponibles
        const espaciosActuales = data.espacios[fecha] || 8;
        if (espaciosActuales <= 0) {
            return res.status(400).json({ error: 'No hay espacios disponibles para esta fecha' });
        }
        
        // Reducir espacios disponibles
        data.espacios[fecha] = espaciosActuales - 1;
        
        // Agregar reserva
        const nuevaReserva = {
            id: Date.now().toString(),
            fecha,
            ...reservaData,
            timestamp: new Date().toISOString()
        };
        data.reservas.push(nuevaReserva);
        
        await writeData(data);
        
        res.json({ 
            success: true, 
            reserva: nuevaReserva,
            espaciosDisponibles: data.espacios[fecha]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar la reserva' });
    }
});

// Endpoint para cancelar una reserva
app.delete('/api/reservar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readData();
        
        const reservaIndex = data.reservas.findIndex(r => r.id === id);
        if (reservaIndex === -1) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        
        const reserva = data.reservas[reservaIndex];
        const fecha = reserva.fecha;
        
        // Aumentar espacios disponibles
        data.espacios[fecha] = (data.espacios[fecha] || 8) + 1;
        
        // Eliminar reserva
        data.reservas.splice(reservaIndex, 1);
        
        await writeData(data);
        
        res.json({ 
            success: true,
            espaciosDisponibles: data.espacios[fecha]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al cancelar la reserva' });
    }
});

// Endpoint para sincronizar espacios (para actualizaciones en tiempo real)
app.get('/api/sync-espacios', async (req, res) => {
    try {
        const data = await readData();
        res.json({
            espacios: data.espacios,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en sincronización' });
    }
});

// Inicializar espacios para los próximos miércoles
app.post('/api/inicializar-espacios', async (req, res) => {
    try {
        const data = await readData();
        const hoy = new Date();
        
        // Generar fechas de los próximos 12 miércoles
        for (let i = 0; i < 12; i++) {
            const fecha = new Date(hoy);
            fecha.setDate(hoy.getDate() + (i * 7) + (3 - hoy.getDay() + 7) % 7);
            
            if (fecha > hoy) {
                const fechaStr = fecha.toISOString().split('T')[0];
                if (!data.espacios[fechaStr]) {
                    data.espacios[fechaStr] = 8;
                }
            }
        }
        
        await writeData(data);
        res.json({ success: true, espacios: data.espacios });
    } catch (error) {
        res.status(500).json({ error: 'Error al inicializar espacios' });
    }
});

// Endpoint para enviar webhook a N8N (proxy para evitar CORS)
app.post('/api/send-webhook', async (req, res) => {
    try {
        const webhookData = req.body;
        console.log('🚀 Enviando webhook a N8N:', webhookData);
        
        // Configuración del webhook N8N
        const N8N_WEBHOOK_URL = 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash';
        const url = new URL(N8N_WEBHOOK_URL);
        
        const postData = JSON.stringify(webhookData);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'ErrikaldeCarWash/1.0'
            }
        };
        
        // Hacer la llamada HTTPS
        const webhookRequest = https.request(options, (webhookResponse) => {
            let data = '';
            
            webhookResponse.on('data', (chunk) => {
                data += chunk;
            });
            
            webhookResponse.on('end', () => {
                console.log('✅ Respuesta de N8N:', webhookResponse.statusCode, data);
                console.log('📧 Headers de respuesta:', webhookResponse.headers);
                
                // Mostrar información específica para debug de WhatsApp
                if (webhookData.type === 'booking') {
                    console.log('📱 MENSAJE WHATSAPP ENVIADO:');
                    console.log('   📞 Teléfono:', webhookData.phone);
                    console.log('   📝 Tipo:', webhookData.type);
                    console.log('   🆔 ID Reserva:', webhookData.reservationId);
                    console.log('   ⚡ Status N8N:', webhookResponse.statusCode);
                    
                    if (webhookResponse.statusCode === 200) {
                        console.log('   ✅ Webhook recibido por N8N correctamente');
                        console.log('   🔍 PROBLEMA POSIBLE: El flujo de N8N no está enviando WhatsApp');
                        console.log('   💡 SOLUCIÓN: Verificar configuración de WhatsApp en N8N');
                    }
                }
                
                if (webhookResponse.statusCode >= 200 && webhookResponse.statusCode < 300) {
                    res.json({ 
                        success: true, 
                        status: webhookResponse.statusCode,
                        response: data,
                        debug: {
                            phone: webhookData.phone,
                            type: webhookData.type,
                            reservationId: webhookData.reservationId,
                            n8nStatus: webhookResponse.statusCode
                        }
                    });
                } else {
                    res.status(webhookResponse.statusCode).json({ 
                        error: 'Error en webhook N8N',
                        status: webhookResponse.statusCode,
                        response: data 
                    });
                }
            });
        });
        
        webhookRequest.on('error', (error) => {
            console.error('❌ Error enviando webhook:', error);
            res.status(500).json({ 
                error: 'Error de conexión con N8N',
                details: error.message 
            });
        });
        
        // Enviar los datos
        webhookRequest.write(postData);
        webhookRequest.end();
        
    } catch (error) {
        console.error('❌ Error en endpoint webhook:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('Sistema de sincronización de espacios activo');
    console.log('Webhook proxy N8N disponible en /api/send-webhook');
}); 