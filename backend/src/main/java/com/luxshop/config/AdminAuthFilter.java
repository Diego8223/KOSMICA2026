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
 * Protege los endpoints de administración con una clave secreta enviada
 * en el header  X-Admin-Key.
 *
 * Endpoints protegidos:
 *   - PATCH  /api/orders/{id}/status      (cambiar estado de pedido)
 *   - GET    /api/users                   (listar clientes)
 *   - POST   /api/users/{email}/add-points (sumar puntos manualmente)
 *   - GET    /api/orders?all=true          (exportar todos los pedidos)
 *
 * Configura ADMIN_API_KEY en Render con el resultado de:
 *   openssl rand -hex 32
 */
@Slf4j
@Component
@Order(1)
public class AdminAuthFilter extends OncePerRequestFilter {

    @Value("${admin.api.key:}")
    private String adminApiKey;

    // Rutas que requieren la clave de admin (prefijos exactos o métodos específicos)
    private static final Set<String> PROTECTED_PREFIXES = Set.of(
        "/api/users"        // GET lista clientes, POST add-points
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path   = request.getRequestURI();
        String method = request.getMethod();

        if (isAdminEndpoint(path, method)) {

            // Si la clave no está configurada en el servidor, bloqueamos de todas formas
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
        // GET /api/users — listar todos los clientes
        if ("GET".equals(method) && "/api/users".equals(path)) return true;

        // POST /api/users/{email}/add-points — sumar puntos manualmente
        if ("POST".equals(method) && path.matches("/api/users/.+/add-points")) return true;

        // FIX: POST /api/users/{email}/purchase-points — protegido para evitar acreditacion fraudulenta
        // Sin esta proteccion, cualquiera puede enviar un POST con total=9999999 y regalar puntos falsos.
        if ("POST".equals(method) && path.matches("/api/users/.+/purchase-points")) return true;

        // PATCH /api/orders/{id}/status — cambiar estado de pedido
        if ("PATCH".equals(method) && path.matches("/api/orders/\\d+/status")) return true;

        // GET /api/orders — exportar todos los pedidos (admin)
        if ("GET".equals(method) && "/api/orders".equals(path)) return true;

        // ✅ FIX: GET /api/gift-cards/all — solo admin puede listar todas las gift cards
        if ("GET".equals(method) && "/api/gift-cards/all".equals(path)) return true;

        // ✅ FIX: DELETE /api/products/{id}/reviews/{rid} — moderar reseñas
        if ("DELETE".equals(method) && path.matches("/api/products/\\d+/reviews/\\d+")) return true;
        if ("PATCH".equals(method) && path.matches("/api/products/\\d+/reviews/\\d+/moderate")) return true;

        // ✅ FIX: POST /api/push/send — enviar push a todos (solo admin)
        if ("POST".equals(method) && "/api/push/send".equals(path)) return true;

        return false;
    }
}
