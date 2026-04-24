package com.luxshop.constants;

// ============================================================
//  KOSMICA — PointsConstantsTest.java
//  Tests de regresión para la lógica de puntos.
//  Verifican que la fórmula nunca vuelva a romperse.
//
//  Ejecutar con: mvn test -Dtest=PointsConstantsTest
// ============================================================

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PointsConstants — reglas de negocio")
class PointsConstantsTest {

    // ── Fórmula de acumulación por compra ─────────────────

    @ParameterizedTest(name = "${0} COP → {1} pts")
    @CsvSource({
        "50000,  50",
        "120000, 120",
        "999,    0",
        "1000,   1",
        "1500,   1",
        "1999,   1",
        "2000,   2",
        "100000, 100",
        "500000, 500",
        "0,      0",
    })
    @DisplayName("calculatePurchasePoints: 1 pt por cada $1.000 COP")
    void testCalculatePurchasePoints(long totalCop, int expectedPoints) {
        assertThat(PointsConstants.calculatePurchasePoints(totalCop))
            .isEqualTo(expectedPoints);
    }

    @Test
    @DisplayName("calculatePurchasePoints: valores negativos devuelven 0")
    void testNegativeTotal() {
        assertThat(PointsConstants.calculatePurchasePoints(-1000)).isEqualTo(0);
    }

    // ── Conversión puntos → COP ───────────────────────────

    @ParameterizedTest(name = "{0} pts → ${1} COP")
    @CsvSource({
        "500,  12500",
        "1,    25",
        "100,  2500",
        "1000, 25000",
        "0,    0",
    })
    @DisplayName("pointsToCop: 1 punto = $25 COP siempre")
    void testPointsToCop(int points, long expectedCop) {
        assertThat(PointsConstants.pointsToCop(points)).isEqualTo(expectedCop);
    }

    // ── Máximo canjeable por pedido (30%) ─────────────────

    @ParameterizedTest(name = "pedido ${0} → máx {1} pts canjeables")
    @CsvSource({
        "50000,  600",    // 30% de $50k = $15k → 600 pts
        "80000,  960",    // 30% de $80k = $24k → 960 pts
        "100000, 1200",   // 30% = $30k → 1200 pts
        "10000,  120",    // por debajo del mínimo, pero la función solo calcula el tope
    })
    @DisplayName("maxRedeemablePoints: siempre 30% del pedido")
    void testMaxRedeemablePoints(long orderTotal, int expectedMax) {
        assertThat(PointsConstants.maxRedeemablePoints(orderTotal))
            .isEqualTo(expectedMax);
    }

    // ── Puntos de check-in por racha ──────────────────────

    @ParameterizedTest(name = "día {0} de racha → {1} pts")
    @CsvSource({
        "1,  5",
        "2,  5",
        "3,  10",
        "4,  10",
        "5,  10",
        "6,  10",
        "7,  15",
        "10, 15",
        "30, 15",
    })
    @DisplayName("checkinPoints: escala según racha")
    void testCheckinPoints(int streak, int expectedPoints) {
        assertThat(PointsConstants.checkinPoints(streak)).isEqualTo(expectedPoints);
    }

    // ── Niveles (tiers) ───────────────────────────────────

    @ParameterizedTest(name = "{0} pts → nivel {1}")
    @CsvSource({
        "0,    ESENCIAL",
        "499,  ESENCIAL",
        "500,  PREMIUM",
        "1499, PREMIUM",
        "1500, VIP",
        "9999, VIP",
    })
    @DisplayName("calculateTier: niveles correctos")
    void testCalculateTier(int points, String expectedTier) {
        assertThat(PointsConstants.calculateTier(points)).isEqualTo(expectedTier);
    }

    // ── Verificación de consistencia de constantes ────────

    @Test
    @DisplayName("500 pts mínimos = $12.500 COP (consistencia frontend↔backend)")
    void testMinRedeemConsistency() {
        long cop = PointsConstants.pointsToCop(PointsConstants.REDEEM_MIN_POINTS);
        assertThat(cop).isEqualTo(12_500L);
    }

    @Test
    @DisplayName("Fórmula docs: $50.000 → 50 pts (ejemplo del spec)")
    void testSpecExample1() {
        assertThat(PointsConstants.calculatePurchasePoints(50_000)).isEqualTo(50);
    }

    @Test
    @DisplayName("Fórmula docs: $120.000 → 120 pts (ejemplo del spec)")
    void testSpecExample2() {
        assertThat(PointsConstants.calculatePurchasePoints(120_000)).isEqualTo(120);
    }

    @Test
    @DisplayName("Límite diario: 500 pts/día = $12.500 COP máximo de 'deuda' diaria")
    void testDailyLimitImpact() {
        long maxDailyCost = PointsConstants.pointsToCop(PointsConstants.DAILY_PURCHASE_LIMIT);
        assertThat(maxDailyCost).isEqualTo(12_500L);
    }

    @Test
    @DisplayName("División correcta: NO /20, NO /36 — SIEMPRE /1000")
    void testDivisionIsAlways1000() {
        // Verificar que la constante es exactamente 1_000
        assertThat(PointsConstants.POINTS_PER_COP_UNIT).isEqualTo(1_000);

        // Verificar que nunca hay diferencia con dividir por 1000 manualmente
        for (int total = 1_000; total <= 500_000; total += 1_000) {
            int expected = total / 1_000;
            int actual   = PointsConstants.calculatePurchasePoints(total);
            assertThat(actual)
                .as("Para total=%d, esperaba %d pts pero obtuvo %d", total, expected, actual)
                .isEqualTo(expected);
        }
    }
}
