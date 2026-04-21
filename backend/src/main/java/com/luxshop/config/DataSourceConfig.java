package com.luxshop.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

/**
 * ✅ FIX: Configuración programática de HikariCP para Supabase Transaction Pooler.
 *
 * Por qué este archivo existe:
 * Supabase (con PgBouncer en transaction mode) cierra conexiones inactivas.
 * Hikari las guarda en el pool y al reutilizarlas recibe "Tenant or user not found".
 *
 * Esta configuración asegura que:
 *   1. Hikari nunca mantenga conexiones abiertas en reposo (minimum-idle=0)
 *   2. Las conexiones se descarten antes de que Supabase las mate (max-lifetime=55s)
 *   3. Cada conexión se valide con SELECT 1 antes de ser usada
 *   4. Los prepared statements se deshabiliten (incompatibles con PgBouncer)
 */
@Slf4j
@Configuration
public class DataSourceConfig {

    @Value("${spring.datasource.url}")
    private String jdbcUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Bean
    @Primary
    public DataSource dataSource() {
        // Validación temprana: detectar URL incorrecta antes de arrancar
        validateDataSourceUrl(jdbcUrl);

        HikariConfig config = new HikariConfig();

        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");

        // ── Pool sizing ─────────────────────────────────────────────
        // Con Render free tier y Supabase free tier, mantener el pool pequeño.
        config.setMaximumPoolSize(2);
        config.setMinimumIdle(0); // No mantener conexiones en reposo

        // ── Timeouts ────────────────────────────────────────────────
        config.setConnectionTimeout(30_000);   // 30s para obtener conexión del pool
        config.setValidationTimeout(5_000);    // 5s para validar con SELECT 1
        config.setIdleTimeout(30_000);         // Descartar conexión inactiva a los 30s
        config.setMaxLifetime(55_000);         // Descartar conexión a los 55s (Supabase mata a ~5min, pero en free tier puede ser antes)
        config.setKeepaliveTime(0);            // Sin keepalive: Supabase cierra igualmente

        // ── Validación de salud antes de usar la conexión ───────────
        config.setConnectionTestQuery("SELECT 1");

        // ── Propiedades del driver JDBC ─────────────────────────────
        // CRÍTICO: prepareThreshold=0 deshabilita prepared statements del lado del driver.
        // PgBouncer (que usa Supabase internamente) no soporta prepared statements
        // en transaction mode. Sin esto, la segunda query de una misma conexión falla.
        config.addDataSourceProperty("prepareThreshold", "0");
        config.addDataSourceProperty("preparedStatementCacheQueries", "0");
        config.addDataSourceProperty("preparedStatementCacheSizeMiB", "0");

        // SSL: en Supabase es obligatorio
        if (jdbcUrl.contains("supabase.com") || jdbcUrl.contains("sslmode=require")) {
            config.addDataSourceProperty("sslmode", "require");
        }

        config.setPoolName("KosmicaPool");

        log.info("✅ DataSource configurado | url={} | maxPool={} | minIdle={}",
            maskPassword(jdbcUrl), config.getMaximumPoolSize(), config.getMinimumIdle());

        return new HikariDataSource(config);
    }

    /**
     * Detecta problemas comunes de configuración y falla rápido con mensaje claro.
     */
    private void validateDataSourceUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalStateException(
                "❌ SPRING_DATASOURCE_URL no está configurada. " +
                "Agrégala en Render → kosmica-backend → Environment Variables."
            );
        }

        // Detectar si están usando la conexión directa (5432) en vez del pooler (6543)
        if (url.contains("supabase.co:5432") && !url.contains("pooler")) {
            log.warn(
                "⚠️  ADVERTENCIA: Estás usando la conexión DIRECTA de Supabase (puerto 5432). " +
                "Para Render, usa el Transaction Pooler (puerto 6543) para evitar el error " +
                "'Tenant or user not found'. " +
                "URL del pooler en: Supabase Dashboard → Settings → Database → Transaction Pooler."
            );
        }

        // Detectar falta de sslmode en URLs de Supabase
        if (url.contains("supabase") && !url.contains("sslmode")) {
            log.warn(
                "⚠️  ADVERTENCIA: La URL de Supabase no contiene 'sslmode=require'. " +
                "Supabase requiere SSL. Agrega '&sslmode=require' al final de la URL."
            );
        }

        // Detectar falta de prepareThreshold
        if (url.contains("supabase") && !url.contains("prepareThreshold=0")) {
            log.warn(
                "⚠️  ADVERTENCIA: La URL no contiene 'prepareThreshold=0'. " +
                "Sin esto, los prepared statements del driver pueden fallar con PgBouncer."
            );
        }
    }

    private String maskPassword(String url) {
        if (url == null) return "null";
        return url.replaceAll(":[^:@/]+@", ":***@");
    }
}
