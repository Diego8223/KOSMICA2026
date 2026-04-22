package com.luxshop.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * FIX: Rate limiting en endpoints públicos para evitar flood/abuso.
 * Límite: 60 requests por minuto por IP en endpoints públicos.
 * Los endpoints de admin ya están protegidos por AdminAuthFilter.
 */
@Slf4j
@Component
@Order(2)
public class RateLimitFilter extends OncePerRequestFilter {

    // IP → [contador, timestamp inicio ventana]
    private final ConcurrentHashMap<String, long[]> ipCounters = new ConcurrentHashMap<>();

    private static final int MAX_REQUESTS = 60;       // máx requests por ventana
    private static final long WINDOW_MS   = 60_000L;  // ventana de 1 minuto

    // Endpoints públicos que protegemos
    private static final String[] RATE_LIMITED_PATHS = {
        "/api/products",
        "/api/orders",
        "/api/users/forgot-password",
        "/api/users/reset-password",
        "/api/referrals",
        "/api/push/subscribe",
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // Solo aplicar a endpoints públicos específicos
        if (!isRateLimited(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = getClientIp(request);
        long now   = System.currentTimeMillis();

        ipCounters.compute(ip, (key, val) -> {
            if (val == null || (now - val[1]) > WINDOW_MS) {
                // Nueva ventana
                return new long[]{ 1, now };
            }
            val[0]++;
            return val;
        });

        long[] counter = ipCounters.get(ip);
        if (counter != null && counter[0] > MAX_REQUESTS) {
            log.warn("⚠️ Rate limit superado | ip={} | path={} | requests={}", ip, path, counter[0]);
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Demasiadas solicitudes. Intenta en un momento.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimited(String path) {
        for (String limited : RATE_LIMITED_PATHS) {
            if (path.startsWith(limited)) return true;
        }
        return false;
    }

    private String getClientIp(HttpServletRequest request) {
        // Render usa X-Forwarded-For
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
