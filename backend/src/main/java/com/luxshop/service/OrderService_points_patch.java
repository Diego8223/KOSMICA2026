package com.luxshop.service;

// ══════════════════════════════════════════════════════════════
//  KOSMICA — OrderService_points_patch.java
//
//  PARCHE de integración: cómo los puntos se conectan con el
//  flujo de pedidos existente.
//
//  Este archivo NO reemplaza OrderService.java completo.
//  Muestra SOLO los métodos/secciones que deben modificarse
//  o añadirse para integrar el sistema de puntos.
//
//  Buscar en OrderService.java los comentarios:
//    // TODO PUNTOS (1) → confirmación de pago
//    // TODO PUNTOS (2) → cancelación de pedido
//    // TODO PUNTOS (3) → aplicar descuento de puntos en el total
// ══════════════════════════════════════════════════════════════

import com.luxshop.constants.PointsConstants;
import com.luxshop.dto.PointsDtos.*;
import com.luxshop.model.Order;
import lombok.extern.slf4j.Slf4j;

/**
 * Métodos de integración para añadir a OrderService.java.
 * Requiere inyectar PointsService en OrderService.
 *
 * Añadir al constructor de OrderService:
 *   private final PointsService pointsService;
 */
@Slf4j
public class OrderService_points_patch {

    // ══════════════════════════════════════════════════════════
    //  (1) Añadir en el método que confirma un pago exitoso
    //      (ej: confirmPayment, handleWompiWebhook, markAsPaid)
    // ══════════════════════════════════════════════════════════

    /**
     * Llamar DESPUÉS de que el pedido pase a estado PAID.
     * Acredita los puntos de la compra al cliente.
     *
     * Integración en OrderService:
     * <pre>
     *   // Al final de confirmPayment() o handleSuccessfulPayment():
     *   awardPointsForOrder(savedOrder);
     * </pre>
     */
    void awardPointsForOrder(Order order, PointsService pointsService) {
        if (order.getCustomerEmail() == null || order.getTotal() == null) return;

        try {
            AddPurchasePointsRequest req = new AddPurchasePointsRequest();
            req.setTotalCop(order.getTotal().longValue());
            req.setOrderNumber(order.getOrderNumber());

            AddPointsResponse result = pointsService.awardPurchasePoints(
                order.getCustomerEmail(), req);

            log.info("[ORDER→POINTS] Orden {} | email={} | total=${} | pts acreditados={} | nuevo saldo={}",
                order.getOrderNumber(), order.getCustomerEmail(),
                order.getTotal(), result.getPointsAwarded(), result.getNewBalance());

        } catch (Exception e) {
            // Los puntos son un beneficio secundario: el pedido NO debe fallar si hay error aquí
            log.error("[ORDER→POINTS] Error acreditando puntos para orden {}: {}",
                order.getOrderNumber(), e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════
    //  (2) Añadir en el método de cancelación de pedido
    // ══════════════════════════════════════════════════════════

    /**
     * Si el pedido fue cancelado DESPUÉS de acreditar puntos,
     * revertir los puntos otorgados.
     *
     * Integración:
     * <pre>
     *   // En cancelOrder() o handleCancellation():
     *   revokePointsForOrder(order);
     * </pre>
     *
     * IMPORTANTE: solo revertir si el estado anterior era PAID.
     * Si el pedido nunca se pagó, no hay puntos que revertir.
     */
    void revokePointsForOrder(Order order, PointsService pointsService) {
        if (order.getCustomerEmail() == null || order.getTotal() == null) return;

        // Calcular los puntos que se otorgaron (misma fórmula)
        int pointsToRevoke = PointsConstants.calculatePurchasePoints(
            order.getTotal().longValue());

        if (pointsToRevoke <= 0) return;

        try {
            // Usar addBonusPoints con puntos negativos como ADMIN adjustment
            AddBonusPointsRequest req = new AddBonusPointsRequest();
            req.setType("ADMIN");
            req.setAdminPoints(-pointsToRevoke);   // ← negativo = reversión
            // Nota: si adminPoints negativo causa problemas, considerar un tipo
            // REVOKE separado en TransactionType

            log.info("[ORDER→POINTS] Reverso puntos por cancelación de orden {} | -{} pts",
                order.getOrderNumber(), pointsToRevoke);

            // Implementación alternativa directa (más segura):
            // pointsService.addPoints(order.getCustomerEmail(), -pointsToRevoke,
            //     "Reverso cancelación orden #" + order.getOrderNumber());

        } catch (Exception e) {
            log.error("[ORDER→POINTS] Error revirtiendo puntos para orden {}: {}",
                order.getOrderNumber(), e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════
    //  (3) Aplicar descuento de puntos al calcular el total
    //      del pedido en el checkout
    // ══════════════════════════════════════════════════════════

    /**
     * Patrón para aplicar el descuento de puntos en createOrder().
     *
     * El frontend manda: { ..., pointsToRedeem: 500 }
     * El backend ejecuta el canje ANTES de crear el pedido.
     *
     * Ejemplo en OrderService.createOrder():
     * <pre>
     *   long baseTotal = subtotal + shippingCost - couponDiscount - giftCardDiscount;
     *   long pointsDiscount = 0;
     *
     *   if (request.getPointsToRedeem() != null && request.getPointsToRedeem() > 0) {
     *       RedeemPointsRequest redeemReq = new RedeemPointsRequest();
     *       redeemReq.setPointsToRedeem(request.getPointsToRedeem());
     *       redeemReq.setOrderTotalCop(baseTotal);
     *       redeemReq.setOrderNumber(orderNumber); // generado previamente
     *
     *       RedeemResponse redeem = pointsService.redeemPoints(
     *           request.getCustomerEmail(), redeemReq);
     *
     *       pointsDiscount = redeem.getDiscountCop();
     *   }
     *
     *   long finalTotal = Math.max(0, baseTotal - pointsDiscount);
     *   order.setPointsDiscount(pointsDiscount);  // campo nuevo en Order
     *   order.setTotal(finalTotal);
     * </pre>
     *
     * Añadir a orders table:
     *   points_discount  DECIMAL(12,2) NOT NULL DEFAULT 0,
     *   points_redeemed  INTEGER       NOT NULL DEFAULT 0,
     */
    void applyPointsDiscount_documentation_only() {
        // Este método es solo documentación.
        // Ver el bloque de código en el javadoc arriba.
    }

    // ══════════════════════════════════════════════════════════
    //  (4) Acreditar puntos por REFERRAL cuando un referido compra
    // ══════════════════════════════════════════════════════════

    /**
     * Llamar desde ReferralService cuando se confirma que un
     * usuario referido completó su primera compra.
     *
     * Añadir en ReferralService.redeemReferralCode():
     * <pre>
     *   AddBonusPointsRequest bonus = new AddBonusPointsRequest();
     *   bonus.setType("REFERRAL");
     *   pointsService.awardBonusPoints(referralOwnerEmail, bonus);
     * </pre>
     */
    void referralIntegration_documentation_only() {
        // Ver javadoc arriba.
    }

    // ══════════════════════════════════════════════════════════
    //  (5) Acreditar puntos por REVIEW cuando se aprueba una reseña
    // ══════════════════════════════════════════════════════════

    /**
     * Llamar desde ReviewService.approveReview():
     * <pre>
     *   AddBonusPointsRequest bonus = new AddBonusPointsRequest();
     *   bonus.setType("REVIEW");
     *   bonus.setReference(String.valueOf(review.getProductId()));
     *   pointsService.awardBonusPoints(review.getUserEmail(), bonus);
     * </pre>
     */
    void reviewIntegration_documentation_only() {
        // Ver javadoc arriba.
    }
}
