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