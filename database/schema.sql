-- =====================================================================
-- Marketplace · Esquema completo (orquestador)
-- =====================================================================
-- Motor: MySQL 8 · InnoDB · utf8mb4 · utf8mb4_unicode_ci
--
-- Uso (ejecutar desde el directorio `database/`):
--   mysql -u root -p < schema.sql
--   -- o dentro del cliente mysql:
--   mysql> SOURCE schema.sql;
--
-- Los archivos se aplican en orden de dependencias de claves foráneas.
-- Los seeds NO se incluyen aquí: aplícalos por separado si los necesitas
--   mysql> SOURCE seeds/001_catalogos.sql;
--   mysql> SOURCE seeds/002_demo.sql;
-- =====================================================================

CREATE DATABASE IF NOT EXISTS marketplace
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE marketplace;

SET NAMES utf8mb4;

-- --- Estructura: tablas por módulo (orden por dependencias) ---
SOURCE migrations/001_ubicaciones.sql;
SOURCE migrations/002_usuarios.sql;
SOURCE migrations/003_productos.sql;
SOURCE migrations/004_administracion.sql;
SOURCE migrations/005_ventas.sql;
SOURCE migrations/006_comunicacion.sql;
SOURCE migrations/007_comunidad.sql;

-- --- Índices de rendimiento ---
SOURCE indexes/001_performance_indexes.sql;

-- --- Vistas ---
SOURCE views/001_views.sql;

-- --- Funciones y procedimientos ---
SOURCE procedures/001_procedures.sql;

-- --- Triggers ---
SOURCE triggers/001_triggers.sql;
