// Configuración de la base de datos MySQL/MariaDB para Errekalde Car Wash
module.exports = {
  mysql: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '', // Sin contraseña inicialmente
    database: 'errekalde_car_wash',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  },
  
  // Puerto del servidor Express
  port: process.env.PORT || 3001,
  
  // Configuración de backups
  backup: {
    enabled: true,
    interval: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
    directory: './backups/',
    keepDays: 30 // Mantener backups por 30 días
  },
  
  // Configuración de logs
  logging: {
    level: 'info', // debug, info, warn, error
    file: './logs/app.log'
  }
}; 