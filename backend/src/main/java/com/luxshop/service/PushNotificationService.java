package com.luxshop.service;

import com.luxshop.model.PushSubscription;
import com.luxshop.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.util.ArrayList;
import java.util.HashMap;
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

    static {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    private final PushSubscriptionRepository subscriptionRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${vapid.public.key:}")
    private String vapidPublicKey;

    @Value("${vapid.private.key:}")
    private String vapidPrivateKey;

    @Value("${store.url:https://www.kosmica.com.co}")
    private String storeUrl;

    private boolean isConfigured() {
        return vapidPublicKey != null && !vapidPublicKey.isBlank()
            && vapidPrivateKey != null && !vapidPrivateKey.isBlank();
    }

    // ── Guardar o actualizar suscripción ───────────────────────
    // FIX: ahora también guarda el email si viene en el payload
    @SuppressWarnings("unchecked")
    public PushSubscription saveSubscription(Map<String, Object> payload) {
        String endpoint = (String) payload.get("endpoint");

        // El browser envía { endpoint, keys: { p256dh, auth } }
        // Algunos wrappers anidan las keys en payload.keys.keys — lo manejamos
        Map<String, String> keys;
        Object rawKeys = payload.get("keys");
        if (rawKeys instanceof Map) {
            Map<String, Object> keysMap = (Map<String, Object>) rawKeys;
            if (keysMap.containsKey("keys")) {
                keys = (Map<String, String>) keysMap.get("keys");
            } else {
                keys = (Map<String, String>) rawKeys;
            }
        } else {
            throw new IllegalArgumentException("Payload push inválido: falta 'keys'");
        }

        String p256dh = keys.get("p256dh");
        String auth   = keys.get("auth");

        // Email opcional — el frontend lo puede enviar junto a la suscripción
        String email = (String) payload.get("email");

        PushSubscription sub = subscriptionRepo.findByEndpoint(endpoint)
            .orElse(new PushSubscription());

        sub.setEndpoint(endpoint);
        sub.setP256dh(p256dh);
        sub.setAuth(auth);
        sub.setActive(true);

        // Guardar email si viene y si no tenía uno ya
        if (email != null && !email.isBlank()) {
            sub.setEmail(email);
        }

        PushSubscription saved = subscriptionRepo.save(sub);
        log.info("✅ Suscripción push guardada. Email: {} | Total activas: {}",
            email != null ? email : "anónimo",
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

    // ── Lista de suscriptores para el panel admin ──────────────
    public List<Map<String, Object>> getSubscriberList() {
        List<PushSubscription> subs = subscriptionRepo.findAllByActiveTrue();
        List<Map<String, Object>> result = new ArrayList<>();
        for (PushSubscription sub : subs) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", sub.getId());
            item.put("email", sub.getEmail() != null ? sub.getEmail() : "Anónimo");
            item.put("createdAt", sub.getCreatedAt() != null ? sub.getCreatedAt().toString() : "");
            // Mostrar solo los primeros 40 chars del endpoint para identificarlo
            String ep = sub.getEndpoint();
            item.put("device", ep != null && ep.length() > 40 ? ep.substring(0, 40) + "..." : ep);
            result.add(item);
        }
        return result;
    }
}
