package com.luxshop.service;

import com.luxshop.constants.PointsConstants;
import com.luxshop.dto.PointsDtos.*;
import com.luxshop.exception.EntityNotFoundException;
import com.luxshop.model.PointTransaction;
import com.luxshop.model.PointTransaction.TransactionType;
import com.luxshop.model.User;
import com.luxshop.repository.PointTransactionRepository;
import com.luxshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * ╔══════════════════════════════════════════════════════════╗
 *  KOSMICA — PointsService.java
 *
 *  Toda la lógica de negocio del sistema de puntos.
 *  El frontend NUNCA calcula: solo llama a este servicio
 *  y muestra lo que se devuelve.
 *
 *  Reglas de negocio:
 *  • 1 punto = $1.000 COP gastados  → floor(total / 1.000)
 *  • Límite diario compras: 500 pts (se reinicia cada día)
 *  • Check-in NO cuenta para límite diario
 *  • 1 punto = $25 COP al canjear
 *  • Mínimo canje: 500 pts ($12.500 COP)
 *  • Máximo canje: 30% del total del pedido
 *  • Pedido mínimo para usar puntos: $50.000 COP
 *  • Expiración: 60 días sin uso
 * ╚══════════════════════════════════════════════════════════╝
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PointsService {

    private final UserRepository             userRepo;
    private final PointTransactionRepository txRepo;

    private static final DateTimeFormatter ISO_FMT = DateTimeFormatter.ISO_DATE_TIME;


    // ══════════════════════════════════════════════════════════
    //  1. SALDO Y RESUMEN
    // ══════════════════════════════════════════════════════════

    /**
     * Devuelve el resumen completo de puntos del usuario.
     * Este objeto es la única fuente de verdad para el frontend.
     */
    @Transactional(readOnly = true)
    public PointsBalanceResponse getBalance(String email) {
        User user = requireUser(email);
        LocalDateTime now      = LocalDateTime.now();
        LocalDate     today    = LocalDate.now();

        int balance       = safePoints(user);
        int expiring7     = txRepo.sumPointsExpiringSoon(email, now, now.plusDays(7));
        boolean canRedeem = balance >= PointsConstants.REDEEM_MIN_POINTS;

        int streak        = safeInt(user.getCheckinStreak());
        boolean checkedIn = today.equals(user.getLastCheckinDate());
        int nextCheckin   = checkedIn ? 0 : PointsConstants.checkinPoints(streak + 1);

        String tier       = PointsConstants.calculateTier(balance);

        return PointsBalanceResponse.builder()
            .balance(balance)
            .balanceCop(PointsConstants.pointsToCop(balance))
            .tier(tier)
            .tierMinPoints(tierMinPoints(tier))
            .nextTierPoints(nextTierPoints(balance))
            .expiringIn7Days(expiring7)
            .canRedeem(canRedeem)
            .redeemMinPoints(PointsConstants.REDEEM_MIN_POINTS)
            .redeemMinCop(PointsConstants.pointsToCop(PointsConstants.REDEEM_MIN_POINTS))
            .checkinStreak(streak)
            .lastCheckinDate(user.getLastCheckinDate())
            .checkedInToday(checkedIn)
            .nextCheckinPoints(nextCheckin)
            .build();
    }


    // ══════════════════════════════════════════════════════════
    //  2. ACUMULACIÓN POR COMPRA
    // ══════════════════════════════════════════════════════════

    /**
     * Otorga puntos por una compra completada.
     *
     * Pasos:
     *  1. Calcular puntos brutos: floor(totalCOP / 1.000)
     *  2. Verificar límite diario acumulado
     *  3. Acreditar los puntos que caben dentro del límite
     *  4. Registrar transacción con fecha de expiración (ahora + 60 días)
     *  5. Actualizar saldo y racha de compras en users
     *
     * @param email       email del cliente
     * @param request     total de la compra y número de orden
     * @return resumen de la acreditación
     */
    @Transactional
    public AddPointsResponse awardPurchasePoints(String email, AddPurchasePointsRequest request) {
        User      user  = requireUser(email);
        LocalDate today = LocalDate.now();

        // ── Paso 1: puntos brutos ────────────────────────────
        int rawPoints = PointsConstants.calculatePurchasePoints(request.getTotalCop());

        // ── Paso 2: límite diario ────────────────────────────
        int dailyEarnedSoFar = getDailyEarned(user, today);
        int remaining        = Math.max(0, PointsConstants.DAILY_PURCHASE_LIMIT - dailyEarnedSoFar);
        int toAward          = Math.min(rawPoints, remaining);
        int capped           = rawPoints - toAward;

        log.info("[POINTS] PURCHASE {} | orden={} | total=${} | brutos={} | límite={}/{} | acreditar={}",
            email, request.getOrderNumber(), request.getTotalCop(),
            rawPoints, dailyEarnedSoFar, PointsConstants.DAILY_PURCHASE_LIMIT, toAward);

        // ── Paso 3: acreditar ────────────────────────────────
        if (toAward > 0) {
            LocalDateTime expiresAt = LocalDateTime.now()
                                        .plusDays(PointsConstants.EXPIRY_DAYS);

            PointTransaction tx = PointTransaction.builder()
                .userEmail(email)
                .type(TransactionType.PURCHASE)
                .points(toAward)
                .description(String.format(
                    "Compra #%s — $%,.0f COP → %d pts",
                    request.getOrderNumber(), (double) request.getTotalCop(), toAward))
                .orderNumber(request.getOrderNumber())
                .expiresAt(expiresAt)
                .pointsRemaining(toAward)
                .build();
            txRepo.save(tx);

            // Actualizar saldo del usuario
            user.setPoints(safePoints(user) + toAward);
            user.setDailyPointsEarned(dailyEarnedSoFar + toAward);
            user.setLastPointsDate(today);
        }

        // ── Racha de compras ────────────────────────────────
        updatePurchaseStreak(user, today);
        userRepo.save(user);

        int newDaily = dailyEarnedSoFar + toAward;
        return AddPointsResponse.builder()
            .pointsAwarded(toAward)
            .newBalance(safePoints(user))
            .pointsCappedByDailyLimit(capped)
            .dailyEarned(newDaily)
            .dailyRemaining(Math.max(0, PointsConstants.DAILY_PURCHASE_LIMIT - newDaily))
            .tier(PointsConstants.calculateTier(safePoints(user)))
            .build();
    }


    // ══════════════════════════════════════════════════════════
    //  3. BONOS (SIGNUP, REFERRAL, REVIEW, ADMIN)
    // ══════════════════════════════════════════════════════════

    /**
     * Otorga puntos por un evento especial (no compra).
     * Estos puntos NO cuentan para el límite diario de compras.
     */
    @Transactional
    public AddPointsResponse awardBonusPoints(String email, AddBonusPointsRequest request) {
        User user = requireUser(email);

        TransactionType type;
        int points;
        String description;

        switch (request.getType().toUpperCase()) {
            case "SIGNUP" -> {
                type        = TransactionType.SIGNUP;
                points      = PointsConstants.BONUS_SIGNUP;
                description = "Bono por crear tu cuenta";
            }
            case "REFERRAL" -> {
                type        = TransactionType.REFERRAL;
                points      = PointsConstants.BONUS_REFERRAL;
                description = "Bono por referido — tu amigo realizó su primera compra";
            }
            case "REVIEW" -> {
                type        = TransactionType.REVIEW;
                points      = PointsConstants.BONUS_REVIEW;
                description = "Bono por reseña de producto"
                    + (request.getReference() != null ? " #" + request.getReference() : "");
            }
            case "ADMIN" -> {
                if (request.getAdminPoints() == null || request.getAdminPoints() <= 0)
                    throw new IllegalArgumentException("adminPoints debe ser > 0 para tipo ADMIN");
                type        = TransactionType.ADMIN;
                points      = request.getAdminPoints();
                description = "Ajuste manual de puntos";
            }
            default -> throw new IllegalArgumentException(
                "Tipo de bono inválido: " + request.getType());
        }

        LocalDateTime expiresAt = LocalDateTime.now().plusDays(PointsConstants.EXPIRY_DAYS);

        PointTransaction tx = PointTransaction.builder()
            .userEmail(email)
            .type(type)
            .points(points)
            .description(description)
            .expiresAt(expiresAt)
            .pointsRemaining(points)
            .build();
        txRepo.save(tx);

        user.setPoints(safePoints(user) + points);
        userRepo.save(user);

        log.info("[POINTS] BONUS {} | tipo={} | +{} pts | total={}", email, type, points, user.getPoints());

        return AddPointsResponse.builder()
            .pointsAwarded(points)
            .newBalance(safePoints(user))
            .pointsCappedByDailyLimit(0)
            .dailyEarned(getDailyEarned(user, LocalDate.now()))
            .dailyRemaining(Math.max(0, PointsConstants.DAILY_PURCHASE_LIMIT - getDailyEarned(user, LocalDate.now())))
            .tier(PointsConstants.calculateTier(safePoints(user)))
            .build();
    }


    // ══════════════════════════════════════════════════════════
    //  4. CHECK-IN DIARIO
    // ══════════════════════════════════════════════════════════

    /**
     * Registra el check-in diario del usuario.
     * Incrementa racha y otorga puntos según el día de la racha.
     * Si ya hizo check-in hoy, devuelve el estado actual sin modificar.
     *
     * Puntos por racha:
     *  Días 1-2:  +5 pts
     *  Días 3-6: +10 pts
     *  Día 7+:   +15 pts
     *
     * ⚠️ Estos puntos NO cuentan para el límite diario de compras.
     */
    @Transactional
    public AddPointsResponse doCheckin(String email) {
        User      user      = requireUser(email);
        LocalDate today     = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        // Ya hizo check-in hoy: retornar estado actual sin cambios
        if (today.equals(user.getLastCheckinDate())) {
            log.info("[POINTS] CHECKIN {} ya realizado hoy", email);
            return AddPointsResponse.builder()
                .pointsAwarded(0)
                .newBalance(safePoints(user))
                .pointsCappedByDailyLimit(0)
                .dailyEarned(getDailyEarned(user, today))
                .dailyRemaining(Math.max(0, PointsConstants.DAILY_PURCHASE_LIMIT - getDailyEarned(user, today)))
                .tier(PointsConstants.calculateTier(safePoints(user)))
                .build();
        }

        // Calcular nueva racha
        int prevStreak = safeInt(user.getCheckinStreak());
        int newStreak;
        if (yesterday.equals(user.getLastCheckinDate())) {
            newStreak = prevStreak + 1;
        } else {
            newStreak = 1;  // racha rota
        }

        int pts = PointsConstants.checkinPoints(newStreak);

        PointTransaction tx = PointTransaction.builder()
            .userEmail(email)
            .type(TransactionType.CHECKIN)
            .points(pts)
            .description(String.format("Check-in día %d — racha %d", newStreak, newStreak))
            .expiresAt(LocalDateTime.now().plusDays(PointsConstants.EXPIRY_DAYS))
            .pointsRemaining(pts)
            .build();
        txRepo.save(tx);

        user.setPoints(safePoints(user) + pts);
        user.setCheckinStreak(newStreak);
        user.setLastCheckinDate(today);
        userRepo.save(user);

        log.info("[POINTS] CHECKIN {} | racha={} | +{} pts | total={}", email, newStreak, pts, user.getPoints());

        return AddPointsResponse.builder()
            .pointsAwarded(pts)
            .newBalance(safePoints(user))
            .pointsCappedByDailyLimit(0)
            .dailyEarned(getDailyEarned(user, today))
            .dailyRemaining(Math.max(0, PointsConstants.DAILY_PURCHASE_LIMIT - getDailyEarned(user, today)))
            .tier(PointsConstants.calculateTier(safePoints(user)))
            .build();
    }


    // ══════════════════════════════════════════════════════════
    //  5. VALIDACIÓN DE CANJE
    // ══════════════════════════════════════════════════════════

    /**
     * Valida si un canje es posible SIN ejecutarlo.
     * Llamar antes de mostrar el botón de "Aplicar puntos" en el checkout.
     */
    @Transactional(readOnly = true)
    public RedeemValidationResponse validateRedeem(String email, long orderTotalCop,
                                                   int pointsRequested) {
        User user    = requireUser(email);
        int balance  = safePoints(user);
        long balCop  = PointsConstants.pointsToCop(balance);

        // Constantes a devolver siempre (para que el frontend no las hardcodee)
        var builder = RedeemValidationResponse.builder()
            .pointValueCop(PointsConstants.COP_PER_POINT)
            .minRedeemPoints(PointsConstants.REDEEM_MIN_POINTS)
            .minOrderCop(PointsConstants.REDEEM_MIN_ORDER_COP)
            .availablePoints(balance)
            .availableCop(balCop)
            .maxRedeemablePoints(PointsConstants.maxRedeemablePoints(orderTotalCop))
            .maxRedeemableCop(PointsConstants.pointsToCop(
                PointsConstants.maxRedeemablePoints(orderTotalCop)));

        // Validación 1: pedido mínimo
        if (orderTotalCop < PointsConstants.REDEEM_MIN_ORDER_COP) {
            return builder.valid(false)
                .errorCode("ORDER_TOO_SMALL")
                .message(String.format(
                    "El pedido mínimo para usar puntos es $%,.0f COP",
                    (double) PointsConstants.REDEEM_MIN_ORDER_COP))
                .build();
        }

        // Validación 2: puntos mínimos del usuario
        if (balance < PointsConstants.REDEEM_MIN_POINTS) {
            return builder.valid(false)
                .errorCode("INSUFFICIENT_POINTS")
                .message(String.format(
                    "Necesitas al menos %d puntos para canjear. Tienes %d.",
                    PointsConstants.REDEEM_MIN_POINTS, balance))
                .build();
        }

        // Validación 3: puntos solicitados no superen lo que tiene
        if (pointsRequested > balance) {
            return builder.valid(false)
                .errorCode("NOT_ENOUGH_POINTS")
                .message(String.format("Tienes %d puntos, no puedes canjear %d.",
                    balance, pointsRequested))
                .build();
        }

        // Validación 4: límite del 30% del pedido
        int maxAllowed = PointsConstants.maxRedeemablePoints(orderTotalCop);
        if (pointsRequested > maxAllowed) {
            return builder.valid(false)
                .errorCode("EXCEEDS_ORDER_LIMIT")
                .message(String.format(
                    "El máximo es %d puntos ($%,.0f COP) — 30%% del pedido.",
                    maxAllowed, (double) PointsConstants.pointsToCop(maxAllowed)))
                .build();
        }

        return builder.valid(true).message("Canje válido").build();
    }


    // ══════════════════════════════════════════════════════════
    //  6. EJECUCIÓN DEL CANJE
    // ══════════════════════════════════════════════════════════

    /**
     * Ejecuta el canje de puntos. Llama validateRedeem primero.
     *
     * Algoritmo FIFO: consume primero los lotes que expiran antes.
     * Registra una transacción REDEEM negativa.
     *
     * @param email    email del cliente
     * @param request  puntos a canjear, total del pedido, orden
     * @return descuento aplicado en COP y saldo restante
     */
    @Transactional
    public RedeemResponse redeemPoints(String email, RedeemPointsRequest request) {
        // Validar primero
        RedeemValidationResponse validation = validateRedeem(
            email, request.getOrderTotalCop(), request.getPointsToRedeem());
        if (!validation.isValid()) {
            throw new IllegalArgumentException(validation.getMessage());
        }

        User user          = requireUser(email);
        int  toRedeem      = request.getPointsToRedeem();
        long discountCop   = PointsConstants.pointsToCop(toRedeem);

        log.info("[POINTS] REDEEM {} | puntos={} | descuento=${} COP | orden={}",
            email, toRedeem, discountCop, request.getOrderNumber());

        // ── Consumir lotes FIFO ──────────────────────────────
        List<PointTransaction> batches = txRepo.findAvailableBatchesForRedeem(
            email, LocalDateTime.now());

        int remaining = toRedeem;
        for (PointTransaction batch : batches) {
            if (remaining <= 0) break;

            int consume = Math.min(remaining, batch.getPointsRemaining());
            txRepo.updatePointsRemaining(batch.getId(), batch.getPointsRemaining() - consume);
            remaining -= consume;
        }

        if (remaining > 0) {
            // No debería ocurrir si validateRedeem pasó; loguear y lanzar
            throw new IllegalStateException(
                "Inconsistencia de puntos: " + remaining + " pts no encontrados en lotes");
        }

        // ── Registrar transacción de canje ───────────────────
        PointTransaction redeemTx = PointTransaction.builder()
            .userEmail(email)
            .type(TransactionType.REDEEM)
            .points(-toRedeem)
            .description(String.format(
                "Canje en orden #%s — %d pts = $%,.0f COP de descuento",
                request.getOrderNumber(), toRedeem, (double) discountCop))
            .orderNumber(request.getOrderNumber())
            .pointsRemaining(0)
            .build();
        txRepo.save(redeemTx);

        // ── Actualizar saldo del usuario ─────────────────────
        int newBalance = Math.max(0, safePoints(user) - toRedeem);
        user.setPoints(newBalance);
        userRepo.save(user);

        return RedeemResponse.builder()
            .pointsRedeemed(toRedeem)
            .discountCop(discountCop)
            .newBalance(newBalance)
            .newOrderTotal(Math.max(0, request.getOrderTotalCop() - discountCop))
            .build();
    }


    // ══════════════════════════════════════════════════════════
    //  7. HISTORIAL
    // ══════════════════════════════════════════════════════════

    /**
     * Devuelve el historial de transacciones del usuario (últimas N).
     */
    @Transactional(readOnly = true)
    public List<TransactionHistoryItem> getHistory(String email, int limit) {
        requireUser(email);
        List<PointTransaction> txs = txRepo.findRecentByEmail(email,
            limit > 0 ? limit : 20);

        List<TransactionHistoryItem> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (PointTransaction tx : txs) {
            boolean expired = tx.getExpiresAt() != null && tx.getExpiresAt().isBefore(now);
            result.add(TransactionHistoryItem.builder()
                .id(tx.getId())
                .type(tx.getType().name())
                .points(tx.getPoints())
                .description(tx.getDescription())
                .orderNumber(tx.getOrderNumber())
                .expiresAt(tx.getExpiresAt() != null
                    ? tx.getExpiresAt().format(ISO_FMT) : null)
                .createdAt(tx.getCreatedAt().format(ISO_FMT))
                .expired(expired)
                .build());
        }
        return result;
    }


    // ══════════════════════════════════════════════════════════
    //  8. EXPIRACIÓN (job nocturno)
    // ══════════════════════════════════════════════════════════

    /**
     * Expira los lotes de puntos cuya fecha de expiración ya pasó.
     * Debe llamarse por un @Scheduled job (ej: 2 AM diario).
     *
     * @return total de puntos expirados en esta ejecución
     */
    @Transactional
    public int expireOldPoints() {
        LocalDateTime now = LocalDateTime.now();

        // Obtener todos los emails con puntos por expirar
        List<PointTransaction> expired = txRepo.findExpiredBatches("*", now);
        // En producción: usar una query que traiga por grupos de email
        // Aquí usamos el método individual como referencia

        int totalExpired = 0;

        // Agrupamos por email para una sola actualización por usuario
        // (implementación simplificada — en prod usar query GROUP BY)
        for (PointTransaction batch : expired) {
            String batchEmail = batch.getUserEmail();
            User   user       = userRepo.findByEmailIgnoreCase(batchEmail).orElse(null);
            if (user == null) continue;

            int expAmt = batch.getPointsRemaining();

            // Registrar expiración
            txRepo.save(PointTransaction.builder()
                .userEmail(batchEmail)
                .type(TransactionType.EXPIRE)
                .points(-expAmt)
                .description(String.format(
                    "%d puntos expirados (ganados el %s)",
                    expAmt,
                    batch.getCreatedAt().toLocalDate()))
                .pointsRemaining(0)
                .build());

            // Agotar el lote
            txRepo.updatePointsRemaining(batch.getId(), 0);

            // Descontar del usuario
            user.setPoints(Math.max(0, safePoints(user) - expAmt));
            userRepo.save(user);

            totalExpired += expAmt;
        }

        if (totalExpired > 0) {
            log.info("[POINTS] EXPIRE job: {} puntos expirados en esta ejecución", totalExpired);
        }
        return totalExpired;
    }


    // ══════════════════════════════════════════════════════════
    //  UTILIDADES PRIVADAS
    // ══════════════════════════════════════════════════════════

    private User requireUser(String email) {
        return userRepo.findByEmailIgnoreCase(email.toLowerCase().trim())
            .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado: " + email));
    }

    private int safePoints(User user) {
        return user.getPoints() == null ? 0 : user.getPoints();
    }

    private int safeInt(Integer val) {
        return val == null ? 0 : val;
    }

    /** Devuelve los puntos ganados hoy por COMPRAS (resetea si es otro día). */
    private int getDailyEarned(User user, LocalDate today) {
        if (today.equals(user.getLastPointsDate())) {
            return safeInt(user.getDailyPointsEarned());
        }
        return 0;  // nuevo día, contador en 0
    }

    private void updatePurchaseStreak(User user, LocalDate today) {
        LocalDate yesterday   = today.minusDays(1);
        LocalDate lastPurchase = user.getLastPurchaseDate();
        int prev = safeInt(user.getPurchaseStreak());

        if (today.equals(lastPurchase)) {
            // misma compra del día, no incrementar
        } else if (yesterday.equals(lastPurchase)) {
            user.setPurchaseStreak(prev + 1);
        } else {
            user.setPurchaseStreak(1);  // racha rota
        }
        user.setLastPurchaseDate(today);
    }

    private int tierMinPoints(String tier) {
        return switch (tier) {
            case "VIP"     -> PointsConstants.TIER_VIP_MIN;
            case "PREMIUM" -> PointsConstants.TIER_PREMIUM_MIN;
            default        -> 0;
        };
    }

    private Integer nextTierPoints(int balance) {
        if (balance >= PointsConstants.TIER_VIP_MIN)     return null;
        if (balance >= PointsConstants.TIER_PREMIUM_MIN) return PointsConstants.TIER_VIP_MIN;
        return PointsConstants.TIER_PREMIUM_MIN;
    }
}
