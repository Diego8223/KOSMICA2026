package com.luxshop.service;

import com.luxshop.model.GiftCard;
import com.luxshop.repository.GiftCardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GiftCardService {

    private final GiftCardRepository giftCardRepo;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    // ─────────────────────────────────────────────────────────────
    //  CREAR tarjeta de regalo (estado PENDING hasta confirmar pago)
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public GiftCard createGiftCard(
            String occasion, String occasionLabel, BigDecimal amount,
            String message, String recipientName, String recipientEmail,
            String senderName, String senderEmail, String senderPhone) {

        String code = generateUniqueCode();

        GiftCard gc = GiftCard.builder()
            .code(code)
            .occasion(occasion)
            .occasionLabel(occasionLabel)
            .originalAmount(amount)
            .balance(amount)
            .message(message)
            .recipientName(recipientName)
            .recipientEmail(recipientEmail.toLowerCase().trim())
            .senderName(senderName)
            .senderEmail(senderEmail.toLowerCase().trim())
            .senderPhone(senderPhone)
            .status("PENDING")
            .build();

        GiftCard saved = giftCardRepo.save(gc);
        log.info("🎁 Tarjeta creada: {} | {} | {} → {}",
            code, amount, senderEmail, recipientEmail);
        return saved;
    }

    // ─────────────────────────────────────────────────────────────
    //  GUARDAR preferenceId de MercadoPago mientras espera pago
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void savePendingPaymentId(String code, String preferenceId) {
        GiftCard gc = giftCardRepo.findByCode(code.toUpperCase())
            .orElseThrow(() -> new RuntimeException("Tarjeta no encontrada: " + code));
        gc.setPaymentId(preferenceId);
        giftCardRepo.save(gc);
        log.info("🔖 Tarjeta {} → preferenceId guardado: {}", code, preferenceId);
    }

    // ─────────────────────────────────────────────────────────────
    //  ACTIVAR tarjeta al confirmar pago en MercadoPago
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public GiftCard activateGiftCard(String code, String paymentId) {
        GiftCard gc = giftCardRepo.findByCode(code.toUpperCase())
            .orElseThrow(() -> new RuntimeException("Tarjeta no encontrada: " + code));

        gc.setStatus("ACTIVE");
        gc.setPaymentId(paymentId);
        gc.setActivatedAt(LocalDateTime.now());

        GiftCard saved = giftCardRepo.save(gc);
        log.info("✅ Tarjeta activada: {} | paymentId: {}", code, paymentId);
        return saved;
    }

    // ─────────────────────────────────────────────────────────────
    //  VALIDAR código antes de aplicar al carrito
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> validateGiftCard(String code) {
        if (code == null || code.isBlank()) {
            return Map.of("valid", false, "message", "Código vacío");
        }

        Optional<GiftCard> opt = giftCardRepo.findByCode(code.toUpperCase().trim());
        if (opt.isEmpty()) {
            return Map.of("valid", false, "message", "Tarjeta no encontrada");
        }

        GiftCard gc = opt.get();

        if ("PENDING".equals(gc.getStatus())) {
            return Map.of("valid", false, "message", "Esta tarjeta aún no ha sido pagada");
        }
        if ("DEPLETED".equals(gc.getStatus())) {
            return Map.of("valid", false, "message", "Esta tarjeta ya no tiene saldo");
        }
        if ("EXPIRED".equals(gc.getStatus())) {
            return Map.of("valid", false, "message", "Esta tarjeta está vencida");
        }
        if (!gc.isActive()) {
            return Map.of("valid", false, "message", "Tarjeta inválida o sin saldo");
        }

        return Map.of(
            "valid",          true,
            "code",           gc.getCode(),
            "balance",        gc.getBalance(),
            "originalAmount", gc.getOriginalAmount(),
            "occasion",       gc.getOccasionLabel() != null ? gc.getOccasionLabel() : gc.getOccasion(),
            "message",        gc.getMessage() != null ? gc.getMessage() : "",
            "recipientName",  gc.getRecipientName(),
            "message_ok",     "Tarjeta válida — saldo disponible: $" + gc.getBalance().toPlainString()
        );
    }

    // ─────────────────────────────────────────────────────────────
    //  REDIMIR (descontar saldo) al confirmar pedido
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> redeemGiftCard(String code, BigDecimal amountToUse,
                                               String orderNumber, String redeemerEmail) {
        if (code == null || code.isBlank()) {
            return Map.of("success", false, "message", "Código vacío");
        }

        GiftCard gc = giftCardRepo.findByCode(code.toUpperCase().trim())
            .orElse(null);

        if (gc == null || !gc.isActive()) {
            return Map.of("success", false, "message", "Tarjeta inválida o sin saldo");
        }

        BigDecimal actualDiscount = amountToUse.min(gc.getBalance());
        BigDecimal newBalance = gc.getBalance().subtract(actualDiscount);

        gc.setBalance(newBalance);
        if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
            gc.setStatus("DEPLETED");
        }

        giftCardRepo.save(gc);
        log.info("💳 Tarjeta {} usada: -{} | saldo restante: {} | pedido: {}",
            code, actualDiscount, newBalance, orderNumber);

        return Map.of(
            "success",          true,
            "amountDiscounted", actualDiscount,
            "remainingBalance", newBalance,
            "message",          "Descuento aplicado correctamente"
        );
    }

    // ─────────────────────────────────────────────────────────────
    //  RECARGAR tarjeta desde admin
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public GiftCard reloadGiftCard(String code, BigDecimal amount) {
        GiftCard gc = giftCardRepo.findByCode(code.toUpperCase())
            .orElseThrow(() -> new RuntimeException("Tarjeta no encontrada: " + code));

        gc.setBalance(gc.getBalance().add(amount));
        if ("DEPLETED".equals(gc.getStatus())) {
            gc.setStatus("ACTIVE");
        }

        GiftCard saved = giftCardRepo.save(gc);
        log.info("🔄 Tarjeta {} recargada: +{} | nuevo saldo: {}", code, amount, saved.getBalance());
        return saved;
    }

    // ─────────────────────────────────────────────────────────────
    //  CONSULTAS
    // ─────────────────────────────────────────────────────────────
    public List<GiftCard> getAllGiftCards() {
        return giftCardRepo.findAllByOrderByCreatedAtDesc();
    }

    public List<GiftCard> getGiftCardsBySender(String email) {
        return giftCardRepo.findBySenderEmailOrderByCreatedAtDesc(email.toLowerCase().trim());
    }

    public Optional<GiftCard> getByCode(String code) {
        return giftCardRepo.findByCode(code.toUpperCase().trim());
    }

    // FIX: buscar por paymentId para el webhook de MercadoPago
    public Optional<GiftCard> findByPaymentId(String paymentId) {
        return giftCardRepo.findByPaymentId(paymentId);
    }

    // ─────────────────────────────────────────────────────────────
    //  UTIL — generador de códigos únicos
    // ─────────────────────────────────────────────────────────────
    private String generateUniqueCode() {
        String code;
        int attempts = 0;
        do {
            code = "GIFT-" + randomSegment(6);
            attempts++;
            if (attempts > 20) throw new RuntimeException("No se pudo generar código único");
        } while (giftCardRepo.findByCode(code).isPresent());
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
