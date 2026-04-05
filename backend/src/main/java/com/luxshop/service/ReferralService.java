package com.luxshop.service;

import com.luxshop.model.ReferralCode;
import com.luxshop.repository.ReferralCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Servicio central del sistema "Invita y Gana".
 *
 * REGLAS CLAVE:
 *   - Solo usuarios registrados (con email válido) pueden obtener código.
 *   - El código es ÚNICO por usuario y se genera automáticamente.
 *   - NO puede ser redimido por el mismo usuario que lo generó.
 *   - Cada código solo es válido UNA sola vez (uso único).
 *   - Una vez redimido queda bloqueado para siempre.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReferralService {

    private final ReferralCodeRepository referralRepo;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0,O,1,I para evitar confusión

    // ─────────────────────────────────────────────────────────────────
    //  OBTENER O CREAR el código de un usuario registrado
    // ─────────────────────────────────────────────────────────────────

    /**
     * Devuelve el código activo del usuario o genera uno nuevo.
     * Requiere que el usuario esté registrado (email + nombre).
     *
     * @param ownerEmail email del usuario registrado
     * @param ownerName  nombre del usuario
     * @return el ReferralCode del usuario
     */
    @Transactional
    public ReferralCode getOrCreateCode(String ownerEmail, String ownerName) {
        ownerEmail = ownerEmail.toLowerCase().trim();

        // ¿Ya tiene código activo? lo devolvemos
        Optional<ReferralCode> existing = referralRepo.findByOwnerEmailAndUsedFalse(ownerEmail);
        if (existing.isPresent()) {
            log.info("♻️  Código existente para {}: {}", ownerEmail, existing.get().getCode());
            return existing.get();
        }

        // ¿Ya usó su código anterior? le creamos uno nuevo
        String code = generateUniqueCode();
        ReferralCode ref = ReferralCode.builder()
            .code(code)
            .ownerEmail(ownerEmail)
            .ownerName(ownerName != null ? ownerName.trim() : "Usuario")
            .used(false)
            .build();

        ReferralCode saved = referralRepo.save(ref);
        log.info("🎁  Nuevo código generado para {}: {}", ownerEmail, code);
        return saved;
    }

    // ─────────────────────────────────────────────────────────────────
    //  VALIDAR código antes de aplicar descuento
    // ─────────────────────────────────────────────────────────────────

    /**
     * Valida si un código puede ser usado por un receptor específico.
     *
     * @param code           código a validar
     * @param redeemerEmail  email de quien intenta usarlo (debe estar registrado)
     * @return mapa con {valid, message, ownerName} 
     */
    @Transactional(readOnly = true)
    public Map<String, Object> validateCode(String code, String redeemerEmail) {
        if (code == null || code.isBlank()) {
            return Map.of("valid", false, "message", "Código vacío");
        }

        code = code.toUpperCase().trim();
        redeemerEmail = redeemerEmail.toLowerCase().trim();

        Optional<ReferralCode> opt = referralRepo.findByCode(code);

        if (opt.isEmpty()) {
            return Map.of("valid", false, "message", "Código no existe");
        }

        ReferralCode ref = opt.get();

        // ❌ El dueño NO puede redimir su propio código
        if (ref.getOwnerEmail().equalsIgnoreCase(redeemerEmail)) {
            return Map.of("valid", false, "message",
                "No puedes usar tu propio código. Compártelo con alguien más 💌");
        }

        // ❌ Ya fue usado
        if (Boolean.TRUE.equals(ref.getUsed())) {
            return Map.of("valid", false, "message",
                "Este código ya fue redimido y no puede usarse de nuevo");
        }

        return Map.of(
            "valid",     true,
            "message",   "¡Código válido! Descuento aplicado 🎉",
            "ownerName", ref.getOwnerName(),
            "code",      ref.getCode()
        );
    }

    // ─────────────────────────────────────────────────────────────────
    //  REDIMIR código al confirmar un pedido
    // ─────────────────────────────────────────────────────────────────

    /**
     * Marca el código como USADO al completarse el pedido.
     * Solo se llama cuando el pago fue exitoso.
     *
     * @param code           código a marcar como usado
     * @param redeemerEmail  email de quien lo redimió
     * @param redeemerName   nombre de quien lo redimió
     * @param orderNumber    número del pedido donde se usó
     * @return true si se marcó correctamente, false si algo falló
     */
    @Transactional
    public boolean redeemCode(String code, String redeemerEmail,
                               String redeemerName, String orderNumber) {
        if (code == null || code.isBlank()) return false;

        code = code.toUpperCase().trim();
        redeemerEmail = redeemerEmail.toLowerCase().trim();

        Optional<ReferralCode> opt = referralRepo.findByCode(code);
        if (opt.isEmpty()) {
            log.warn("⚠️  Intento de redimir código inexistente: {}", code);
            return false;
        }

        ReferralCode ref = opt.get();

        // Doble verificación de seguridad
        if (Boolean.TRUE.equals(ref.getUsed())) {
            log.warn("⚠️  Código {} ya estaba usado — intento de reúso bloqueado", code);
            return false;
        }
        if (ref.getOwnerEmail().equalsIgnoreCase(redeemerEmail)) {
            log.warn("⚠️  El dueño {} intentó redimir su propio código", redeemerEmail);
            return false;
        }

        ref.setUsed(true);
        ref.setRedeemedByEmail(redeemerEmail);
        ref.setRedeemedByName(redeemerName);
        ref.setRedeemedInOrder(orderNumber);
        ref.setRedeemedAt(LocalDateTime.now());

        referralRepo.save(ref);
        log.info("✅  Código {} redimido por {} en pedido {}",
            code, redeemerEmail, orderNumber);
        return true;
    }

    // ─────────────────────────────────────────────────────────────────
    //  CONSULTAR historial de un usuario
    // ─────────────────────────────────────────────────────────────────

    public List<ReferralCode> getHistory(String ownerEmail) {
        return referralRepo.findByOwnerEmailOrderByCreatedAtDesc(
            ownerEmail.toLowerCase().trim()
        );
    }

    // ─────────────────────────────────────────────────────────────────
    //  UTIL — generador de códigos únicos
    // ─────────────────────────────────────────────────────────────────

    private String generateUniqueCode() {
        String code;
        int attempts = 0;
        do {
            code = "LUX-" + randomSegment(6);
            attempts++;
            if (attempts > 20) throw new RuntimeException("No se pudo generar código único");
        } while (referralRepo.findByCode(code).isPresent());
        return code;
    }

    private String randomSegment(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString();
    }
}
