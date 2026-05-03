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
        applyOrderPointsColumns(); // ✅ FIX: columnas del PARCHE v2 — sin esto, todo createOrder() falla con 500
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

    /**
     * ✅ FIX: Migración del PARCHE v2 de Order.java
     *
     * El modelo Order fue actualizado con dos campos nuevos (pointsDiscount, pointsRedeemed)
     * que mapean a columnas points_discount y points_redeemed en la tabla orders.
     *
     * Sin estas columnas, cualquier INSERT en orders (crear pedido) lanza:
     *   PSQLException: column "points_discount" of relation "orders" does not exist
     * → Spring lo envuelve como RuntimeException
     * → GlobalExceptionHandler devuelve 500 "Error interno del servidor"
     * → El frontend muestra el toast de error al intentar pagar con Wompi o MercadoPago.
     *
     * El comentario en Order.java decía: "El SQL V3__orders_points_columns.sql añade estas
     * columnas a la BD" — pero ese archivo nunca fue incorporado a este migrador automático.
     */
    private void applyOrderPointsColumns() {
        try {
            jdbcTemplate.execute(
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_discount NUMERIC(10,2) DEFAULT 0.00"
            );
            jdbcTemplate.execute(
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0"
            );
            log.info("✅ Migración orders_points: columnas points_discount y points_redeemed verificadas/creadas correctamente");
        } catch (Exception e) {
            log.error("❌ Error en migración orders_points: {} — {}", e.getClass().getSimpleName(), e.getMessage());
        }
    }
}
