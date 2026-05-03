package com.luxshop.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseMigrationConfig {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void runMigrations() {
        applyResetPasswordColumns();
        applyOrderPointsColumns();
        applyOrderItemsColumns();
        applyProductsExtraColumns();
    }

    private void applyResetPasswordColumns() {
        try {
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users (reset_token)");
            log.info("✅ Migración reset_password: OK");
        } catch (Exception e) {
            log.error("❌ Error en migración reset_password: {} — {}", e.getClass().getSimpleName(), e.getMessage());
        }
    }

    private void applyOrderPointsColumns() {
        try {
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_discount NUMERIC(10,2) NOT NULL DEFAULT 0.00");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0");
            log.info("✅ Migración orders_points: OK");
        } catch (Exception e) {
            log.error("❌ Error en migración orders_points: {} — {}", e.getClass().getSimpleName(), e.getMessage());
        }
    }

    private void applyOrderItemsColumns() {
        try {
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2)");
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_color VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_color_image VARCHAR(500)");
            log.info("✅ Migración order_items: OK");
        } catch (Exception e) {
            log.error("❌ Error en migración order_items: {} — {}", e.getClass().getSimpleName(), e.getMessage());
        }
    }

    private void applyProductsExtraColumns() {
        try {
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS badge VARCHAR(50)");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery TEXT");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION NOT NULL DEFAULT 0.0");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT");
            log.info("✅ Migración products_extra: OK");
        } catch (Exception e) {
            log.error("❌ Error en migración products_extra: {} — {}", e.getClass().getSimpleName(), e.getMessage());
        }
    }
}
