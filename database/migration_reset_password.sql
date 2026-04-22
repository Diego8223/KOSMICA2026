-- ══════════════════════════════════════════════════════════════
--  MIGRACIÓN: Recuperación de contraseña
--  Ejecutar UNA SOLA VEZ en la base de datos de producción
--  Fecha: 2025
-- ══════════════════════════════════════════════════════════════

-- Agregar columnas para el token de recuperación de contraseña
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users (reset_token);

SELECT '✅ Migración reset_password aplicada correctamente' AS resultado;
