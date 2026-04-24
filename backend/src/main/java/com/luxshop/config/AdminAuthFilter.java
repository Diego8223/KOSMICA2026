package com.luxshop.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * ✅ PARCHE v2 — Endpoints nuevos protegidos:
 *
 *  + POST /api/points/expire/run        → ejecutar expiración manual (admin)
 *  + POST /api/points/add/bonus/{email} → acreditar bonos manualmente (admin)
 *
 * Resto del archivo sin cambios.
 */
@Slf4j
@Component
@Order(1)
public class AdminAuthFilter extends OncePerRequestFilter {

    @Value("${admin.api.key:}")
    private String adminApiKey;

    private static final Set<String> PROTECTED_PREFIXES = Set.of(
        "/api/users"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path   = request.getRequestURI();
        String method = request.getMethod();

        if (isAdminEndpoint(path, method)) {

            if (adminApiKey == null || adminApiKey.isBlank()) {
                log.error("⛔ ADMIN_API_KEY no configurada — acceso a {} bloqueado", path);
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("{\"error\":\"Acceso no autorizado\"}");
                return;
            }

            String provided = request.getHeader("X-Admin-Key");
            if (provided == null || !provided.equals(adminApiKey)) {
                log.warn("⛔ Intento de acceso admin sin clave válida | path={} | ip={}",
                    path, request.getRemoteAddr());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Clave de administrador inválida\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAdminEndpoint(String path, String method) {
        // Endpoints de recuperación de contraseña — PÚBLICOS
        if (path.startsWith("/api/users/forgot-password")) return false;
        if (path.startsWith("/api/users/reset-password"))  return false;

        // Check-in del usuario — PÚBLICO (lo hace el propio usuario)
        if ("POST".equals(method) && path.matches("/api/users/.+/checkin")) return false;

        // Saldo y historial de puntos — PÚBLICO (el usuario ve sus propios puntos)
        if ("GET".equals(method)  && path.matches("/api/points/balance/.+"))  return false;
        if ("GET".equals(method)  && path.matches("/api/points/history/.+"))  return false;
        if ("GET".equals(method)  && path.startsWith("/api/points/redeem/validate")) return false;

        // Check-in de puntos — PÚBLICO
        if ("POST".equals(method) && path.matches("/api/points/checkin/.+")) return false;

        // Canje de puntos desde el checkout — PÚBLICO (lo hace el propio usuario)
        if ("POST".equals(method) && path.matches("/api/points/redeem/.+")) return false;

        // ─── Endpoints de ADMIN ──────────────────────────────

        // Listar todos los clientes
        if ("GET".equals(method) && "/api/users".equals(path)) return true;

        // Sumar puntos manualmente (admin)
        if ("POST".equals(method) && path.matches("/api/users/.+/add-points")) return true;

        // Acreditar puntos por compra (protegido para evitar fraude)
        if ("POST".equals(method) && path.matches("/api/users/.+/purchase-points")) return true;

        // Cambiar estado de pedido
        if ("PATCH".equals(method) && path.matches("/api/orders/\\d+/status")) return true;

        // Exportar todos los pedidos
        if ("GET".equals(method) && "/api/orders".equals(path)) return true;

        // Listar todas las gift cards
        if ("GET".equals(method) && "/api/gift-cards/all".equals(path)) return true;

        // Moderar reseñas
        if ("DELETE".equals(method) && path.matches("/api/products/\\d+/reviews/\\d+")) return true;
        if ("PATCH".equals(method)  && path.matches("/api/products/\\d+/reviews/\\d+/moderate")) return true;

        // Enviar push a todos los usuarios
        if ("POST".equals(method) && "/api/push/send".equals(path)) return true;

        // ✅ NUEVO — sistema de puntos (solo admin)
        // Ejecutar expiración manual de puntos
        if ("POST".equals(method) && "/api/points/expire/run".equals(path)) return true;

        // Acreditar bonos manualmente (tipo ADMIN)
        if ("POST".equals(method) && path.matches("/api/points/add/bonus/.+")) return true;

        return false;
    }
}
