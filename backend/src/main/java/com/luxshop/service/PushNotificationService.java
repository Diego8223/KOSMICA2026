package com.luxshop.service;

import com.luxshop.model.PushSubscription;
import com.luxshop.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Servicio para enviar notificaciones push a todos los suscriptores.
 *
 * Casos de uso:
 *  - Nuevo producto publicado
 *  - Oferta / descuento activado desde el admin
 *  - Mensaje personalizado desde el panel admin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private final PushSubscriptionRepository subscriptionRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${vapid.public.key:}")
    private String vapidPublicKey;

    @Value("${vapid.private.key:}")
    private String vapidPrivateKey;

    @Value("${store.url:https://www.kosmica.com.co}")
    private String storeUrl;

    // ── Verificar si el servicio está configurado ──────────────
    private boolean isConfigured() {
        return vapidPublicKey != null && !vapidPublicKey.isBlank()
            && vapidPrivateKey != null && !vapidPrivateKey.isBlank();
    }

    // ── Guardar o actualizar suscripción ───────────────────────
    public PushSubscription saveSubscription(Map<String, Object> payload) {
        String endpoint = (String) payload.get("endpoint");

        @SuppressWarnings("unchecked")
        Map<String, String> keys = (Map<String, String>)
            ((Map<String, Object>) payload.get("keys")).get("keys") != null
                ? (Map<String, String>) ((Map<String, Object>) payload.get("keys")).get("keys")
                : (Map<String, String>) payload.get("keys");

        String p256dh = keys.get("p256dh");
        String auth   = keys.get("auth");

        PushSubscription sub = subscriptionRepo.findByEndpoint(endpoint)
            .orElse(new PushSubscription());

        sub.setEndpoint(endpoint);
        sub.setP256dh(p256dh);
        sub.setAuth(auth);
        sub.setActive(true);

        PushSubscription saved = subscriptionRepo.save(sub);
        log.info("✅ Suscripción push guardada. Total activas: {}",
            subscriptionRepo.findAllByActiveTrue().size());
        return saved;
    }

    // ── Enviar notificación a TODOS los suscriptores ───────────
    public int sendToAll(String title, String body, String url) {
        if (!isConfigured()) {
            log.warn("VAPID no configurado — notificaciones push desactivadas");
            return 0;
        }

        List<PushSubscription> subs = subscriptionRepo.findAllByActiveTrue();
        if (subs.isEmpty()) {
            log.info("No hay suscriptores activos");
            return 0;
        }

        int sent = 0;
        String targetUrl = (url != null && !url.isBlank()) ? url : storeUrl;

        for (PushSubscription sub : subs) {
            try {
                String payload = objectMapper.writeValueAsString(Map.of(
                    "title", title,
                    "body",  body,
                    "url",   targetUrl
                ));

                PushService pushService = new PushService(vapidPublicKey, vapidPrivateKey,
                    "mailto:info@kosmica.com.co");

                Subscription subscription = new Subscription(
                    sub.getEndpoint(),
                    new Subscription.Keys(sub.getP256dh(), sub.getAuth())
                );

                pushService.send(new Notification(subscription, payload));
                sent++;

            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "";
                // El navegador ya no tiene la suscripción activa
                if (msg.contains("410") || msg.contains("404")) {
                    sub.setActive(false);
                    subscriptionRepo.save(sub);
                    log.info("🗑 Suscripción expirada eliminada: {}", sub.getEndpoint());
                } else {
                    log.warn("Error enviando push a {}: {}", sub.getEndpoint(), msg);
                }
            }
        }

        log.info("📣 Notificación enviada a {}/{} suscriptores", sent, subs.size());
        return sent;
    }

    // ── Contar suscriptores activos ────────────────────────────
    public int countActive() {
        return subscriptionRepo.findAllByActiveTrue().size();
    }
}
