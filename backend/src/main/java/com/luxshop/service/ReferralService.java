package com.luxshop.service;

import com.luxshop.dto.PointsDtos.AddBonusPointsRequest;
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
 * ✅ PARCHE v2 — Correcciones aplicadas:
 *
 *  ✅ redeemCode(): ahora acredita +50 pts de fidelización al dueño
 *     del código cuando su referido completa la primera compra.
 *     (antes solo generaba el cupón REF15 pero nunca los puntos)
 *
 * Resto del archivo sin cambios.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReferralService {

    private final ReferralCodeRepository referralRepo;
    private final EmailService           emailService;
    private final PointsService          pointsService;  // ← nuevo

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    // ─────────────────────────────────────────────────────────────────
    //  OBTENER O CREAR código del usuario
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public ReferralCode getOrCreateCode(String ownerEmail, String ownerName, String ownerPhone) {
        ownerEmail = ownerEmail.toLowerCase().trim();

        Optional<ReferralCode> existing = referralRepo.findByOwnerEmailAndUsedFalse(ownerEmail);
        if (existing.isPresent()) {
            ReferralCode ref = existing.get();
            if (ownerPhone != null && !ownerPhone.isBlank()) {
                ref.setOwnerPhone(ownerPhone.trim());
                referralRepo.save(ref);
            }
            log.info("♻️  Código existente para {}: {}", ownerEmail, ref.getCode());
            return ref;
        }

        String code = generateUniqueCode();
        ReferralCode ref = ReferralCode.builder()
            .code(code)
            .ownerEmail(ownerEmail)
            .ownerName(ownerName != null ? ownerName.trim() : "Usuario")
            .ownerPhone(ownerPhone != null ? ownerPhone.trim() : "")
            .dataConsent(true)
            .dataConsentAt(LocalDateTime.now())
            .used(false)
            .build();

        ReferralCode saved = referralRepo.save(ref);
        log.info("🎁  Nuevo código generado para {}: {} | tel: {}", ownerEmail, code, ownerPhone);
        return saved;
    }

    // ─────────────────────────────────────────────────────────────────
    //  VALIDAR código antes de aplicar descuento
    // ─────────────────────────────────────────────────────────────────

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

        if (ref.getOwnerEmail().equalsIgnoreCase(redeemerEmail)) {
            return Map.of("valid", false, "message",
                "No puedes usar tu propio código. Compártelo con alguien más 💌");
        }

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

        String rewardCoupon = generateRewardCoupon();
        ref.setRewardCouponCode(rewardCoupon);
        ref.setRewardCouponGeneratedAt(LocalDateTime.now());

        referralRepo.save(ref);
        log.info("✅  Código {} redimido por {} en pedido {} | Recompensa: {}",
            code, redeemerEmail, orderNumber, rewardCoupon);

        // ✅ NUEVO: acreditar +50 pts de fidelización al dueño del código
        try {
            AddBonusPointsRequest bonus = new AddBonusPointsRequest();
            bonus.setType("REFERRAL");
            pointsService.awardBonusPoints(ref.getOwnerEmail(), bonus);
            log.info("💎 +50 pts de referido acreditados a {}", ref.getOwnerEmail());
        } catch (Exception e) {
            // Los puntos son beneficio secundario: no deben bloquear el flujo
            log.warn("No se pudieron acreditar pts de referido a {}: {}",
                ref.getOwnerEmail(), e.getMessage());
        }

        // Notificar al dueño del código (email + WhatsApp)
        try {
            emailService.sendReferralReward(
                ref.getOwnerEmail(),
                ref.getOwnerName(),
                ref.getOwnerPhone(),
                redeemerName,
                rewardCoupon
            );
        } catch (Exception e) {
            log.error("Error enviando recompensa a {}: {}", ref.getOwnerEmail(), e.getMessage());
        }

        return true;
    }

    // ─────────────────────────────────────────────────────────────────
    //  CONSULTAR historial
    // ─────────────────────────────────────────────────────────────────

    public List<ReferralCode> getHistory(String ownerEmail) {
        return referralRepo.findByOwnerEmailOrderByCreatedAtDesc(
            ownerEmail.toLowerCase().trim()
        );
    }

    // ─────────────────────────────────────────────────────────────────
    //  VALIDAR cupón de recompensa (REF15-XXXXXX)
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> validateRewardCoupon(String couponCode, String ownerEmail) {
        if (couponCode == null || couponCode.isBlank()) {
            return Map.of("valid", false, "message", "Código vacío");
        }

        couponCode = couponCode.toUpperCase().trim();
        ownerEmail = ownerEmail.toLowerCase().trim();

        Optional<ReferralCode> opt = referralRepo.findByRewardCouponCode(couponCode);

        if (opt.isEmpty()) {
            return Map.of("valid", false, "message", "Cupón de recompensa no existe");
        }

        ReferralCode ref = opt.get();

        if (!ref.getOwnerEmail().equalsIgnoreCase(ownerEmail)) {
            return Map.of("valid", false,
                "message", "Este cupón no pertenece a tu cuenta");
        }

        if (!Boolean.TRUE.equals(ref.getUsed())) {
            return Map.of("valid", false,
                "message", "El cupón de recompensa aún no está disponible");
        }

        return Map.of(
            "valid",   true,
            "pct",     15,
            "label",   "15% recompensa referido — gracias por invitar 💜",
            "message", "¡Cupón válido! 15% de descuento aplicado 🎉"
        );
    }

    // ─────────────────────────────────────────────────────────────────
    //  UTIL — generadores de códigos únicos
    // ─────────────────────────────────────────────────────────────────

    private String generateUniqueCode() {
        String code;
        int attempts = 0;
        do {
            code = "KOS-" + randomSegment(6);
            attempts++;
            if (attempts > 20) throw new RuntimeException("No se pudo generar código único");
        } while (referralRepo.findByCode(code).isPresent());
        return code;
    }

    private String generateRewardCoupon() {
        String code;
        int attempts = 0;
        do {
            code = "REF15-" + randomSegment(6);
            attempts++;
            if (attempts > 20) throw new RuntimeException("No se pudo generar cupón de recompensa");
        } while (referralRepo.findByRewardCouponCode(code).isPresent());
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
