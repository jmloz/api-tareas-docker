-- scripts/init.sql
-- Script de inicialización de la base de datos

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos inicializada correctamente';
END $$;