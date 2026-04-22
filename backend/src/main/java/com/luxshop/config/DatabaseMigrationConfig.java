package com.luxshop.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Aplica migraciones de columnas opcionales al arrancar el backend.
 * Usa IF NOT EXISTS para que sea idempotente — no rompe nada si ya existen.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseMigrationConfig {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void runMigrations() {
        applyResetPasswordColumns();
    }

    private void applyResetPasswordColumns() {
        try {
            jdbcTemplate.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100)"
            );
            jdbcTemplate.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP"
            );
            jdbcTemplate.execute(
                "CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users (reset_token)"
            );
            log.info("✅ Migración reset_password: columnas verificadas/creadas correctamente");
        } catch (Exception e) {
            log.error("❌ Error en migración reset_password: {} — {}", e.getClass().getSimpleName(), e.getMessage());
        }
    }
}
