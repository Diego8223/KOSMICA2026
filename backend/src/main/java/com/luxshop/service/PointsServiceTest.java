package com.luxshop.service;

// ============================================================
//  KOSMICA — PointsServiceTest.java
//  Tests de integración para los flujos principales.
//  Usa @DataJpaTest + H2 en memoria.
// ============================================================

import com.luxshop.constants.PointsConstants;
import com.luxshop.dto.PointsDtos.*;
import com.luxshop.model.User;
import com.luxshop.repository.PointTransactionRepository;
import com.luxshop.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@DisplayName("PointsService — flujos de integración")
class PointsServiceTest {

    @Autowired PointsService pointsService;
    @Autowired UserRepository userRepo;

    private static final String EMAIL = "test@kosmica.co";

    @BeforeEach
    void setUp() {
        userRepo.findByEmailIgnoreCase(EMAIL).ifPresent(u -> {
            u.setPoints(0);
            u.setDailyPointsEarned(0);
            u.setLastPointsDate(null);
            userRepo.save(u);
        });

        if (userRepo.findByEmailIgnoreCase(EMAIL).isEmpty()) {
            userRepo.save(User.builder()
                .email(EMAIL)
                .name("Test User")
                .points(0)
                .build());
        }
    }

    // ── Acumulación por compra ────────────────────────────

    @Test
    @DisplayName("Compra $50.000 → acredita 50 pts exactos")
    void testPurchase50k() {
        AddPurchasePointsRequest req = new AddPurchasePointsRequest();
        req.setTotalCop(50_000);
        req.setOrderNumber("ORD-001");

        AddPointsResponse res = pointsService.awardPurchasePoints(EMAIL, req);

        assertThat(res.getPointsAwarded()).isEqualTo(50);
        assertThat(res.getNewBalance()).isEqualTo(50);
        assertThat(res.getPointsCappedByDailyLimit()).isEqualTo(0);
    }

    @Test
    @DisplayName("Compra $120.000 → acredita 120 pts exactos")
    void testPurchase120k() {
        AddPurchasePointsRequest req = new AddPurchasePointsRequest();
        req.setTotalCop(120_000);
        req.setOrderNumber("ORD-002");

        AddPointsResponse res = pointsService.awardPurchasePoints(EMAIL, req);

        assertThat(res.getPointsAwarded()).isEqualTo(120);
        assertThat(res.getNewBalance()).isEqualTo(120);
    }

    @Test
    @DisplayName("Límite diario: segunda compra que supera 500 pts se trunca")
    void testDailyLimitCap() {
        // Primera compra: $400.000 → 400 pts (dentro del límite)
        AddPurchasePointsRequest req1 = new AddPurchasePointsRequest();
        req1.setTotalCop(400_000);
        req1.setOrderNumber("ORD-003");
        AddPointsResponse res1 = pointsService.awardPurchasePoints(EMAIL, req1);
        assertThat(res1.getPointsAwarded()).isEqualTo(400);

        // Segunda compra: $200.000 → 200 pts brutos, pero solo caben 100 (500-400)
        AddPurchasePointsRequest req2 = new AddPurchasePointsRequest();
        req2.setTotalCop(200_000);
        req2.setOrderNumber("ORD-004");
        AddPointsResponse res2 = pointsService.awardPurchasePoints(EMAIL, req2);
        assertThat(res2.getPointsAwarded()).isEqualTo(100);
        assertThat(res2.getPointsCappedByDailyLimit()).isEqualTo(100);
        assertThat(res2.getDailyEarned()).isEqualTo(500);
        assertThat(res2.getDailyRemaining()).isEqualTo(0);
    }

    @Test
    @DisplayName("Tercera compra cuando límite diario alcanzado → 0 pts acreditados")
    void testDailyLimitExhausted() {
        AddPurchasePointsRequest req1 = new AddPurchasePointsRequest();
        req1.setTotalCop(500_000); req1.setOrderNumber("ORD-005");
        pointsService.awardPurchasePoints(EMAIL, req1);

        AddPurchasePointsRequest req2 = new AddPurchasePointsRequest();
        req2.setTotalCop(100_000); req2.setOrderNumber("ORD-006");
        AddPointsResponse res2 = pointsService.awardPurchasePoints(EMAIL, req2);

        assertThat(res2.getPointsAwarded()).isEqualTo(0);
        assertThat(res2.getNewBalance()).isEqualTo(500); // no cambia
    }

    // ── Redención ─────────────────────────────────────────

    @Test
    @DisplayName("Canje válido: 500 pts en pedido $80.000 → $12.500 descuento")
    void testValidRedeem() {
        // Setup: darle 500 pts al usuario
        AddBonusPointsRequest bonus = new AddBonusPointsRequest();
        bonus.setType("SIGNUP"); // 20 pts
        pointsService.awardBonusPoints(EMAIL, bonus);

        // Darle puntos adicionales via admin para llegar a 500
        AddBonusPointsRequest admin = new AddBonusPointsRequest();
        admin.setType("ADMIN");
        admin.setAdminPoints(480);
        pointsService.awardBonusPoints(EMAIL, admin);

        // Canjear
        RedeemPointsRequest req = new RedeemPointsRequest();
        req.setPointsToRedeem(500);
        req.setOrderTotalCop(80_000);
        req.setOrderNumber("ORD-007");

        RedeemResponse res = pointsService.redeemPoints(EMAIL, req);

        assertThat(res.getPointsRedeemed()).isEqualTo(500);
        assertThat(res.getDiscountCop()).isEqualTo(12_500L);
        assertThat(res.getNewBalance()).isEqualTo(0);
        assertThat(res.getNewOrderTotal()).isEqualTo(67_500L);
    }

    @Test
    @DisplayName("Canje inválido: pedido menor a $50.000 → error ORDER_TOO_SMALL")
    void testRedeemOrderTooSmall() {
        RedeemValidationResponse v = pointsService.validateRedeem(EMAIL, 30_000, 500);
        assertThat(v.isValid()).isFalse();
        assertThat(v.getErrorCode()).isEqualTo("ORDER_TOO_SMALL");
    }

    @Test
    @DisplayName("Canje inválido: supera el 30% del pedido")
    void testRedeemExceedsOrderLimit() {
        // 500 pts = $12.500 → 30% de $50.000 = $15.000 = máx 600 pts → válido
        // 1200 pts = $30.000 → 30% de $50.000 = $15.000 = máx 600 pts → inválido
        RedeemValidationResponse v = pointsService.validateRedeem(EMAIL, 50_000, 1_200);
        assertThat(v.isValid()).isFalse();
        assertThat(v.getErrorCode()).isEqualTo("EXCEEDS_ORDER_LIMIT");
        assertThat(v.getMaxRedeemablePoints()).isEqualTo(600); // floor(15000/25)
    }

    // ── Check-in ──────────────────────────────────────────

    @Test
    @DisplayName("Check-in día 1 → +5 pts")
    void testCheckinDay1() {
        AddPointsResponse res = pointsService.doCheckin(EMAIL);
        assertThat(res.getPointsAwarded()).isEqualTo(5);
    }

    @Test
    @DisplayName("Check-in ya realizado hoy → 0 pts (idempotente)")
    void testCheckinIdempotent() {
        pointsService.doCheckin(EMAIL);
        AddPointsResponse res2 = pointsService.doCheckin(EMAIL);
        assertThat(res2.getPointsAwarded()).isEqualTo(0);
    }

    // ── Balance y nivel ───────────────────────────────────

    @Test
    @DisplayName("Nivel ESENCIAL con 0 pts")
    void testTierEsencial() {
        PointsBalanceResponse bal = pointsService.getBalance(EMAIL);
        assertThat(bal.getTier()).isEqualTo("ESENCIAL");
        assertThat(bal.getBalance()).isEqualTo(0);
        assertThat(bal.getBalanceCop()).isEqualTo(0L);
    }

    @Test
    @DisplayName("getBalance devuelve pointValueCop implícito = 25")
    void testBalanceReflectsCorrectPointValue() {
        // Dar 500 pts al usuario
        AddBonusPointsRequest admin = new AddBonusPointsRequest();
        admin.setType("ADMIN");
        admin.setAdminPoints(500);
        pointsService.awardBonusPoints(EMAIL, admin);

        PointsBalanceResponse bal = pointsService.getBalance(EMAIL);
        assertThat(bal.getTier()).isEqualTo("PREMIUM");
        assertThat(bal.getBalance()).isEqualTo(500);
        assertThat(bal.getBalanceCop()).isEqualTo(12_500L); // 500 * 25
        assertThat(bal.isCanRedeem()).isTrue();
    }
}
