// config-example.js - Configuración de ejemplo para MySQL/MariaDB
// Copia este archivo como 'config.js' y ajusta los valores según tu entorno

module.exports = {
    // Configuración de Base de Datos
    database: {
        host: 'localhost',
        port: 3306,
        user: 'errekalde_user',
        password: 'TuPasswordSegura123!',
        database: 'errekalde_car_wash',
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        charset: 'utf8mb4'
    },
    
    // Configuración del Servidor
    server: {
        port: 3001,
        cors: {
            origin: "*",
            methods: ["GET", "POST", "DELETE", "PUT"]
        }
    },
    
    // Configuración de N8N
    n8n: {
        webhookUrl: 'https://n8nserver.swapenergia.com/webhook/errekaldecarwash',
        validationUrl: 'https://n8nserver.swapenergia.com/webhook/validarNúmero'
    },
    
    // Configuración de Espacios
    espacios: {
        maxEspaciosPorDia: 8,
        semanasAdelante: 12,
        diasPermitidos: [3], // Solo miércoles (0=domingo, 1=lunes, ..., 6=sábado)
        inicializarAutomaticamente: true
    },
    
    // Configuración de Logging
    logging: {
        level: 'info', // 'error', 'warn', 'info', 'debug'
        logToFile: false,
        logFile: 'errekalde-car-wash.log'
    }
};

/* 
INSTRUCCIONES DE CONFIGURACIÓN:

1. Copia este archivo como 'config.js':
   cp config-example.js config.js

2. Edita config.js con tus valores específicos

3. O mejor aún, crea un archivo .env con:
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=errekalde_user
   DB_PASSWORD=TuPasswordSegura123!
   DB_NAME=errekalde_car_wash
   PORT=3001

4. El sistema detectará automáticamente si usas .env o config.js
*/ 