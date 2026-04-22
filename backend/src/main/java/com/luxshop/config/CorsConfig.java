package com.luxshop.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${store.url:https://www.kosmica.com.co}")
    private String storeUrl;

    @Value("${cors.extra.origins:}")
    private String extraOrigins;

    // FIX: soporte explícito para la URL del frontend en Render
    @Value("${frontend.url:}")
    private String frontendUrl;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = new ArrayList<>();

        // 1. Orígenes de producción fijos (siempre permitidos)
        origins.add("https://www.kosmica.com.co");
        origins.add("https://kosmica.com.co");

        // 2. URL del frontend (Render static service, configurada via FRONTEND_URL)
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            if (!origins.contains(frontendUrl)) origins.add(frontendUrl);
        }

        // 3. Origen configurado por variable de entorno STORE_URL
        if (storeUrl != null && !storeUrl.isBlank()) {
            if (!origins.contains(storeUrl)) origins.add(storeUrl);
            if (storeUrl.contains("www.")) {
                String sinWww = storeUrl.replace("www.", "");
                if (!origins.contains(sinWww)) origins.add(sinWww);
            } else if (storeUrl.startsWith("https://")) {
                String conWww = storeUrl.replace("https://", "https://www.");
                if (!origins.contains(conWww)) origins.add(conWww);
            }
        }

        // 4. Orígenes de desarrollo local
        origins.add("http://localhost:3000");
        origins.add("http://localhost:5173");
        origins.add("http://localhost:8080");

        // 5. Orígenes adicionales desde variable de entorno CORS_EXTRA_ORIGINS
        if (extraOrigins != null && !extraOrigins.isBlank()) {
            Arrays.stream(extraOrigins.split(","))
                  .map(String::trim)
                  .filter(s -> !s.isBlank())
                  .forEach(o -> { if (!origins.contains(o)) origins.add(o); });
        }

        config.setAllowedOrigins(origins);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "X-Requested-With",
            "Accept", "Origin", "X-Admin-Key"
        ));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
