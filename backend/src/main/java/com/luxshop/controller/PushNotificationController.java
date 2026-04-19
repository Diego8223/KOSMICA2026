package com.luxshop.controller;

import com.luxshop.model.PushSubscription;
import com.luxshop.service.PushNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de notificaciones push.
 *
 * POST /api/push/subscribe     — guarda suscripción del cliente
 * POST /api/push/send          — envía notificación (solo admin)
 * GET  /api/push/count         — cuántos suscriptores activos hay
 * GET  /api/push/subscribers   — lista de suscriptores (panel admin) ← NUEVO
 */
@Slf4j
@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushNotificationController {

    private final PushNotificationService pushService;

    // ── Guardar suscripción cuando el cliente activa notificaciones ──
    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, Object>> subscribe(
            @RequestBody Map<String, Object> subscription) {
        try {
            pushService.saveSubscription(subscription);
            return ResponseEntity.ok(Map.of(
                "ok", true,
                "message", "Suscripción registrada correctamente"
            ));
        } catch (Exception e) {
            log.error("Error guardando suscripción push: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body(Map.of("ok", false, "error", e.getMessage()));
        }
    }

    // ── Enviar notificación a todos (llamado desde el panel admin) ──
    // Body esperado: { "title": "...", "body": "...", "url": "..." }
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> send(
            @RequestBody Map<String, String> body) {
        try {
            String title = body.getOrDefault("title", "¡Novedad en Kosmica! 💜");
            String msg   = body.getOrDefault("body",  "Entra a ver las últimas novedades ✨");
            String url   = body.getOrDefault("url",   "");

            int sent = pushService.sendToAll(title, msg, url);

            return ResponseEntity.ok(Map.of(
                "ok",   true,
                "sent", sent,
                "message", "Notificación enviada a " + sent + " suscriptores"
            ));
        } catch (Exception e) {
            log.error("Error enviando notificación push: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body(Map.of("ok", false, "error", e.getMessage()));
        }
    }

    // ── Cuántos suscriptores activos hay (info para el admin) ──
    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> count() {
        return ResponseEntity.ok(Map.of(
            "active", pushService.countActive()
        ));
    }

    // ── Lista completa de suscriptores activos (panel admin) ──
    @GetMapping("/subscribers")
    public ResponseEntity<List<Map<String, Object>>> subscribers() {
        return ResponseEntity.ok(pushService.getSubscriberList());
    }
}
