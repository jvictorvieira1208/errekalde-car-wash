-- schema-postgresql.sql - Esquema PostgreSQL para Errekalde Car Wash (Producción)
-- Para usar en Render.com o cualquier servicio PostgreSQL

-- Eliminar tablas si existen (para recrear)
DROP TABLE IF EXISTS reserva_servicios CASCADE;
DROP TABLE IF EXISTS reservas CASCADE;
DROP TABLE IF EXISTS servicios CASCADE;
DROP TABLE IF EXISTS espacios_disponibles CASCADE;
DROP TABLE IF EXISTS espacios_audit CASCADE;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de espacios disponibles
CREATE TABLE espacios_disponibles (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    espacios_disponibles INTEGER NOT NULL DEFAULT 8,
    espacios_totales INTEGER NOT NULL DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de servicios disponibles
CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_small DECIMAL(10,2),
    precio_medium DECIMAL(10,2),
    precio_large DECIMAL(10,2),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de reservas
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    marca_vehiculo VARCHAR(50),
    modelo_vehiculo VARCHAR(50),
    tamano_vehiculo VARCHAR(20) CHECK (tamano_vehiculo IN ('small', 'medium', 'large')),
    servicios JSONB,
    precio_total DECIMAL(10,2) NOT NULL,
    notas TEXT,
    codigo_verificacion VARCHAR(10),
    verificado BOOLEAN DEFAULT false,
    estado VARCHAR(20) DEFAULT 'confirmada' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación reservas-servicios (para servicios individuales)
CREATE TABLE reserva_servicios (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER REFERENCES reservas(id) ON DELETE CASCADE,
    servicio_id INTEGER REFERENCES servicios(id),
    precio DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de auditoría para espacios
CREATE TABLE espacios_audit (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    espacios_antes INTEGER NOT NULL,
    espacios_despues INTEGER NOT NULL,
    accion VARCHAR(50) NOT NULL,
    reserva_id INTEGER REFERENCES reservas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización
CREATE INDEX idx_espacios_fecha ON espacios_disponibles(fecha);
CREATE INDEX idx_reservas_fecha ON reservas(fecha);
CREATE INDEX idx_reservas_telefono ON reservas(telefono);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_audit_fecha ON espacios_audit(fecha);

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamp automáticamente
CREATE TRIGGER update_espacios_updated_at BEFORE UPDATE ON espacios_disponibles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para auditoría automática de espacios
CREATE OR REPLACE FUNCTION audit_espacios_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.espacios_disponibles != NEW.espacios_disponibles THEN
        INSERT INTO espacios_audit (fecha, espacios_antes, espacios_despues, accion)
        VALUES (NEW.fecha, OLD.espacios_disponibles, NEW.espacios_disponibles, 'UPDATE');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para auditoría automática
CREATE TRIGGER audit_espacios_trigger AFTER UPDATE ON espacios_disponibles
    FOR EACH ROW EXECUTE FUNCTION audit_espacios_change();

-- Insertar servicios por defecto
INSERT INTO servicios (codigo, nombre, descripcion, precio_small, precio_medium, precio_large) VALUES
('interior', 'Lavado Interior', 'Limpieza completa del interior del vehículo', 20.00, 23.00, 25.00),
('exterior', 'Lavado Exterior', 'Lavado exterior completo con encerado', 18.00, 20.00, 23.00),
('complete', 'Lavado Completo', 'Lavado interior + exterior completo', 35.00, 40.00, 45.00),
('complete-fabric', 'Lavado + Tapicería', 'Lavado completo + limpieza de tapicería', 75.00, 85.00, 95.00),
('headlight-1', 'Pulido 1 Faro', 'Pulido y restauración de un faro', 35.00, 35.00, 35.00),
('headlight-2', 'Pulido 2 Faros', 'Pulido y restauración de ambos faros', 60.00, 60.00, 60.00);

-- Inicializar espacios para los próximos miércoles (12 semanas)
DO $$
DECLARE
    fecha_actual DATE := CURRENT_DATE;
    fecha_miercoles DATE;
    i INTEGER;
BEGIN
    FOR i IN 0..11 LOOP
        -- Calcular el próximo miércoles
        fecha_miercoles := fecha_actual + (3 - EXTRACT(dow FROM fecha_actual) + 7)::INTEGER % 7 + (i * 7);
        
        -- Solo insertar si es una fecha futura
        IF fecha_miercoles > CURRENT_DATE THEN
            INSERT INTO espacios_disponibles (fecha, espacios_disponibles, espacios_totales)
            VALUES (fecha_miercoles, 8, 8)
            ON CONFLICT (fecha) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- Verificar instalación
SELECT 'Esquema PostgreSQL creado exitosamente' as mensaje;
SELECT 'Espacios inicializados:' as espacios, COUNT(*) as total_fechas 
FROM espacios_disponibles WHERE fecha > CURRENT_DATE;
SELECT 'Servicios disponibles:' as servicios, COUNT(*) as total_servicios 
FROM servicios WHERE activo = true; 