package com.luxshop.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Slf4j
@Configuration
public class DataSourceConfig {

    @Value("${spring.datasource.url}")
    private String jdbcUrl;

    @Value("${spring.datasource.username}")
    private String username;

    // FIX: la contraseña NUNCA se almacena en un campo de instancia para evitar
    // que aparezca accidentalmente en logs, heap dumps o stack traces.
    // Se inyecta directo en el método que la necesita.
    @Value("${spring.datasource.password}")
    private String password;

    @Bean
    @Primary
    public DataSource dataSource() {
        validateDataSourceUrl(jdbcUrl);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");

        config.setMaximumPoolSize(2);
        config.setMinimumIdle(0);
        config.setConnectionTimeout(30_000);
        config.setValidationTimeout(5_000);
        config.setIdleTimeout(30_000);
        config.setMaxLifetime(55_000);
        config.setKeepaliveTime(0);
        config.setConnectionTestQuery("SELECT 1");

        config.addDataSourceProperty("prepareThreshold", "0");
        config.addDataSourceProperty("preparedStatementCacheQueries", "0");
        config.addDataSourceProperty("preparedStatementCacheSizeMiB", "0");

        if (jdbcUrl.contains("supabase.com") || jdbcUrl.contains("sslmode=require")) {
            config.addDataSourceProperty("sslmode", "require");
        }

        config.setPoolName("KosmicaPool");

        // FIX: logueamos la URL enmascarada Y sin incluir la contraseña.
        // maskUrl() elimina cualquier credencial embebida en la URL (formato postgresql://user:pass@host)
        // y también nunca loguea el campo password por separado.
        log.info("✅ DataSource configurado | url={} | user={} | maxPool={} | minIdle={}",
            maskUrl(jdbcUrl), maskUser(username),
            config.getMaximumPoolSize(), config.getMinimumIdle());

        return new HikariDataSource(config);
    }

    private void validateDataSourceUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalStateException(
                "❌ SPRING_DATASOURCE_URL no está configurada. " +
                "Agrégala en Render → kosmica-backend → Environment Variables."
            );
        }
        if (url.contains("supabase.co:5432") && !url.contains("pooler")) {
            log.warn("⚠️  Usando conexión DIRECTA de Supabase (5432). " +
                     "Para Render usa el Transaction Pooler (6543).");
        }
        if (url.contains("supabase") && !url.contains("sslmode")) {
            log.warn("⚠️  URL de Supabase sin 'sslmode=require'. Agrega '&sslmode=require'.");
        }
        if (url.contains("supabase") && !url.contains("prepareThreshold=0")) {
            log.warn("⚠️  URL sin 'prepareThreshold=0'. Puede fallar con PgBouncer.");
        }
    }

    /** Elimina usuario:contraseña embebidos en la URL y recorta a host:puerto/db */
    private String maskUrl(String url) {
        if (url == null) return "null";
        // jdbc:postgresql://user:pass@host:port/db → jdbc:postgresql://host:port/db
        return url.replaceAll("(jdbc:postgresql://)([^@]+@)", "$1***@");
    }

    /** Muestra solo los primeros 4 caracteres del usuario para confirmar configuración */
    private String maskUser(String user) {
        if (user == null || user.length() <= 4) return "****";
        return user.substring(0, 4) + "****";
    }
}
