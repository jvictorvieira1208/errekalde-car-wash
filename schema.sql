-- Base de datos para Errekalde Car Wash
CREATE DATABASE IF NOT EXISTS errekalde_car_wash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE errekalde_car_wash;

-- Tabla de espacios disponibles por fecha
CREATE TABLE IF NOT EXISTS espacios_disponibles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fecha DATE NOT NULL UNIQUE,
    espacios_totales TINYINT NOT NULL DEFAULT 8,
    espacios_disponibles TINYINT NOT NULL DEFAULT 8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_fecha (fecha),
    CONSTRAINT chk_espacios_positivos CHECK (espacios_disponibles >= 0),
    CONSTRAINT chk_espacios_maximos CHECK (espacios_disponibles <= espacios_totales)
);

-- Tabla de reservas
CREATE TABLE IF NOT EXISTS reservas (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservation_id VARCHAR(50) NOT NULL UNIQUE,
    fecha DATE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    car_brand VARCHAR(50) NOT NULL,
    car_model VARCHAR(50) NOT NULL,
    car_size ENUM('small', 'medium', 'large') NOT NULL,
    price DECIMAL(6,2) NOT NULL,
    notas TEXT,
    status ENUM('confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_fecha (fecha),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_reservation_id (reservation_id)
);

-- Tabla de servicios (normalizada)
CREATE TABLE IF NOT EXISTS servicios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_code VARCHAR(50) NOT NULL UNIQUE,
    service_name VARCHAR(100) NOT NULL,
    base_price DECIMAL(6,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de servicios por reserva (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS reserva_servicios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reserva_id BIGINT NOT NULL,
    servicio_id INT NOT NULL,
    price_applied DECIMAL(6,2) NOT NULL,
    
    FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id),
    UNIQUE KEY unique_reserva_servicio (reserva_id, servicio_id)
);

-- Tabla de auditoría para cambios de espacios
CREATE TABLE IF NOT EXISTS espacios_audit (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fecha DATE NOT NULL,
    espacios_antes TINYINT NOT NULL,
    espacios_despues TINYINT NOT NULL,
    accion ENUM('reserva', 'cancelacion', 'manual', 'inicializacion') NOT NULL,
    reserva_id BIGINT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detalles TEXT,
    
    INDEX idx_fecha_timestamp (fecha, timestamp),
    FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE SET NULL
);

-- Crear usuario para la aplicación (ajustar según necesidades)
-- CREATE USER IF NOT EXISTS 'errekalde_user'@'localhost' IDENTIFIED BY 'TuPasswordSegura123!';
-- GRANT ALL PRIVILEGES ON errekalde_car_wash.* TO 'errekalde_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Insertar servicios predefinidos (opcional)
INSERT INTO servicios (service_code, service_name, base_price) VALUES
('complete', 'Limpieza Completa', 40.00),
('complete-fabric', 'Limpieza Completa con Tapicería', 70.00),
('complete-leather', 'Limpieza Completa con Cuero', 80.00),
('exterior', 'Solo Exterior', 25.00),
('interior', 'Solo Interior', 30.00),
('headlight-1', 'Un faro', 25.00),
('headlight-2', 'Dos faros', 35.00),
('headlight-4', 'Cuatro faros', 50.00)
ON DUPLICATE KEY UPDATE 
    service_name = VALUES(service_name),
    base_price = VALUES(base_price);

-- Mensaje de confirmación
SELECT 'Base de datos Errekalde Car Wash creada exitosamente!' as mensaje; 