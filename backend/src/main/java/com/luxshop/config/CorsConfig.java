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

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = new ArrayList<>();

        // 1. Añadimos el origen principal (Producción)
        origins.add(storeUrl);
        
        // 2. Añadimos variantes comunes para evitar bloqueos por el "www" o falta de él
        if (storeUrl.contains("www.")) {
            origins.add(storeUrl.replace("www.", ""));
        } else if (storeUrl.startsWith("https://")) {
            origins.add(storeUrl.replace("https://", "https://www."));
        }

        // 3. Orígenes de desarrollo local
        origins.add("http://localhost:3000");
        origins.add("http://localhost:5173");
        origins.add("http://localhost:8080");

        // 4. Procesamos orígenes adicionales desde variables de entorno
        if (extraOrigins != null && !extraOrigins.isBlank()) {
            Arrays.stream(extraOrigins.split(","))
                  .map(String::trim)
                  .filter(s -> !s.isBlank())
                  .forEach(origins::add);
        }

        config.setAllowedOrigins(origins);
        
        // Métodos permitidos
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        
        // Cabeceras permitidas (importante para peticiones fetch/axios)
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));
        
        // Permitir envío de cookies/auth headers
        config.setAllowCredentials(true);
        
        // Tiempo de cache de la respuesta preflight (1 hora)
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        
        return new CorsFilter(source);
    }
}