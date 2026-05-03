package com.luxshop.service;

import com.luxshop.dto.OrderRequest;
import com.luxshop.dto.PointsDtos.*;
import com.luxshop.model.Order;
import com.luxshop.model.OrderItem;
import com.luxshop.model.Product;
import com.luxshop.repository.OrderRepository;
import com.luxshop.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * ✅ PARCHE v2 — Correcciones aplicadas:
 *
 *  ✅ createOrder(): si el request incluye pointsToRedeem > 0,
 *     ejecuta el canje ANTES de calcular el total final.
 *     El descuento de puntos se guarda en order.pointsDiscount.
 *
 *  ✅ updateStatus (PAID): awardPurchasePoints() ahora usa
 *     el total SIN el descuento de puntos para calcular los
 *     puntos ganados (no se ganan puntos sobre puntos).
 *
 * Resto del archivo sin cambios.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository   orderRepo;
    private final ProductRepository productRepo;
    private final EmailService      emailService;
    private final ReferralService   referralService;
    private final UserService       userService;
    private final PointsService     pointsService;   // ← nuevo

    // ════════════════════════════════════════════════════════════
    //  CREAR PEDIDO
    // ════════════════════════════════════════════════════════════
    @Transactional
    public Order createOrder(OrderRequest req) {
        Order order = new Order();
        order.setCustomerName(req.getName());
        order.setCustomerEmail(req.getEmail());
        order.setShippingAddress(req.getAddress());
        order.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "MERCADOPAGO");
        order.setPaymentId(req.getPaymentIntentId());
        order.setStatus(Order.Status.PENDING);
        order.setPhone(req.getPhone());
        order.setDocument(req.getDocument());
        order.setCity(req.getCity());
        order.setNeighborhood(req.getNeighborhood());
        order.setNotes(req.getNotes());

        if (req.getCouponCode() != null && !req.getCouponCode().isBlank()) {
            order.setCouponCode(req.getCouponCode().toUpperCase());
        }
        if (req.getCouponDiscount() != null) {
            order.setCouponDiscount(req.getCouponDiscount());
        }
        if (req.getGiftCardCode() != null && !req.getGiftCardCode().isBlank()) {
            order.setGiftCardCode(req.getGiftCardCode());
        }
        if (req.getGiftCardDiscount() != null) {
            order.setGiftCardDiscount(req.getGiftCardDiscount());
        }

        // Validar código de referido
        if (req.getReferralCode() != null && !req.getReferralCode().isBlank()) {
            String refCode = req.getReferralCode().toUpperCase().trim();
            var validation = referralService.validateCode(refCode, req.getEmail());
            if (Boolean.TRUE.equals(validation.get("valid"))) {
                order.setReferralCode(refCode);
                log.info("🎁 Compra referida por código: {}", refCode);
            } else {
                log.warn("⚠️ Código de referido inválido '{}': {}", refCode, validation.get("message"));
            }
        }

        // Calcular subtotal e ítems
        List<OrderItem> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderRequest.ItemDto item : req.getItems()) {
            Product product = productRepo.findById(item.getProductId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + item.getProductId()));

            if (product.getStock() < item.getQuantity()) {
                throw new RuntimeException("Stock insuficiente para: " + product.getName());
            }

            OrderItem oi = new OrderItem();
            oi.setOrder(order);
            oi.setProduct(product);
            oi.setQuantity(item.getQuantity());
            oi.setUnitPrice(product.getPrice());
            oi.setSubtotal(product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            // ✅ Guardar el color elegido por el cliente
            if (item.getSelectedColor() != null && !item.getSelectedColor().isBlank()) {
                oi.setSelectedColor(item.getSelectedColor().trim());
            }
            items.add(oi);
            subtotal = subtotal.add(oi.getSubtotal());
        }

        BigDecimal shipping  = req.getShippingCost()    != null ? req.getShippingCost()    : BigDecimal.ZERO;
        BigDecimal discount  = req.getCouponDiscount()  != null ? req.getCouponDiscount()  : BigDecimal.ZERO;
        BigDecimal giftDisc  = req.getGiftCardDiscount()!= null ? req.getGiftCardDiscount(): BigDecimal.ZERO;

        // Total base antes del canje de puntos
        BigDecimal baseTotal = subtotal.subtract(discount).subtract(giftDisc).add(shipping);

        // ✅ NUEVO: aplicar descuento de puntos si el cliente los quiere usar
        BigDecimal pointsDiscount = BigDecimal.ZERO;
        int        pointsRedeemed = 0;

        if (req.getPointsToRedeem() != null && req.getPointsToRedeem() > 0) {
            try {
                RedeemValidationResponse validation = pointsService.validateRedeem(
                    req.getEmail(),
                    baseTotal.longValue(),
                    req.getPointsToRedeem()
                );

                if (validation.isValid()) {
                    // El canje se ejecuta aquí; si el pago falla luego,
                    // el admin deberá revertir manualmente (o implementar saga pattern).
                    // Para producción: mover el canje al webhook de PAID.
                    RedeemPointsRequest redeemReq = new RedeemPointsRequest();
                    redeemReq.setPointsToRedeem(req.getPointsToRedeem());
                    redeemReq.setOrderTotalCop(baseTotal.longValue());
                    redeemReq.setOrderNumber("PENDING"); // se actualizará al confirmar

                    RedeemResponse redeemResult = pointsService.redeemPoints(req.getEmail(), redeemReq);
                    pointsDiscount = BigDecimal.valueOf(redeemResult.getDiscountCop());
                    pointsRedeemed = redeemResult.getPointsRedeemed();

                    log.info("💸 Puntos canjeados: {} pts = ${} COP para {}",
                        pointsRedeemed, pointsDiscount, req.getEmail());
                } else {
                    log.warn("⚠️ Canje de puntos inválido para {}: {}", req.getEmail(), validation.getMessage());
                }
            } catch (Exception e) {
                log.warn("No se pudo aplicar canje de puntos para {}: {}", req.getEmail(), e.getMessage());
            }
        }

        order.setItems(items);
        order.setSubtotal(subtotal);
        order.setShippingCost(shipping);
        order.setPointsDiscount(pointsDiscount);
        order.setPointsRedeemed(pointsRedeemed);
        order.setTotal(baseTotal.subtract(pointsDiscount).max(BigDecimal.ZERO));

        Order saved = orderRepo.save(order);
        log.info("📋 Pedido PENDIENTE: {} | Total: {} | Pts canjeados: {} | Pago: {}",
            saved.getOrderNumber(), saved.getTotal(), pointsRedeemed, saved.getPaymentMethod());

        try {
            emailService.sendAdminOrderAlert(saved);
        } catch (Exception e) {
            log.warn("⚠️ Email admin no enviado para {}: {}", saved.getOrderNumber(), e.getMessage());
        }

        return saved;
    }

    // ════════════════════════════════════════════════════════════
    //  ACTUALIZAR ESTADO
    // ════════════════════════════════════════════════════════════
    @Transactional
    public Order updateStatus(Long orderId, Order.Status newStatus) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado: " + orderId));

        Order.Status prevStatus = order.getStatus();
        order.setStatus(newStatus);
        Order saved = orderRepo.save(order);

        log.info("🔄 Pedido {} cambió de {} a {}", saved.getOrderNumber(), prevStatus, newStatus);

        if (newStatus == Order.Status.PAID && prevStatus == Order.Status.PENDING) {
            log.info("💳 Pago confirmado para pedido {} — procesando...", saved.getOrderNumber());

            // 1. Descontar stock
            if (saved.getItems() != null) {
                for (OrderItem item : saved.getItems()) {
                    Product product = item.getProduct();
                    if (product != null) {
                        Product locked = productRepo.findByIdWithLock(product.getId())
                            .orElse(product);
                        int newStock = Math.max(0, locked.getStock() - item.getQuantity());
                        locked.setStock(newStock);
                        productRepo.save(locked);
                        log.info("📦 Stock actualizado: {} → {} unidades", locked.getName(), newStock);
                    }
                }
            }

            // 2. Redimir código de referido
            if (saved.getReferralCode() != null && !saved.getReferralCode().isBlank()) {
                try {
                    boolean redeemed = referralService.redeemCode(
                        saved.getReferralCode(),
                        saved.getCustomerEmail(),
                        saved.getCustomerName(),
                        saved.getOrderNumber()
                    );
                    if (redeemed) {
                        log.info("🎉 Código {} redimido en pedido {}", saved.getReferralCode(), saved.getOrderNumber());
                    }
                } catch (Exception e) {
                    log.error("Error redimiendo código de referido {}: {}", saved.getReferralCode(), e.getMessage());
                }
            }

            // 3. Acreditar puntos de fidelidad
            // ✅ CORRECCIÓN: se acreditan sobre el total REAL pagado (sin el descuento de puntos)
            // No tiene sentido ganar puntos sobre puntos canjeados.
            if (saved.getCustomerEmail() != null && !saved.getCustomerEmail().isBlank()
                    && saved.getTotal() != null) {
                try {
                    userService.awardPurchasePoints(
                        saved.getCustomerEmail(),
                        saved.getTotal().intValue()   // total ya tiene pointsDiscount aplicado
                    );
                    log.info("💎 Puntos acreditados para pedido {}", saved.getOrderNumber());
                } catch (Exception e) {
                    log.warn("No se pudieron acreditar puntos para {}: {}",
                        saved.getCustomerEmail(), e.getMessage());
                }
            }

            // Email de confirmación al cliente
            try {
                emailService.sendOrderConfirmation(saved);
                log.info("✉️ Email de confirmación enviado a: {}", saved.getCustomerEmail());
            } catch (Exception e) {
                log.warn("⚠️ Email de confirmación no enviado para {}: {}", saved.getOrderNumber(), e.getMessage());
            }

        } else if (newStatus != Order.Status.PAID && newStatus != Order.Status.PENDING) {
            try {
                emailService.sendStatusUpdate(saved);
            } catch (Exception e) {
                log.warn("Email de estado no enviado para {}: {}", saved.getOrderNumber(), e.getMessage());
            }
        }

        return saved;
    }

    public Optional<Order> findByNumber(String orderNumber) {
        return orderRepo.findByOrderNumber(orderNumber);
    }

    public Optional<Order> findByPaymentId(String paymentId) {
        return orderRepo.findByPaymentId(paymentId);
    }

    public List<Order> getOrdersByEmail(String email) {
        return orderRepo.findByCustomerEmailOrderByCreatedAtDesc(email);
    }

    @Transactional(readOnly = true)
    public List<Order> getAllOrdersList() {
        return orderRepo.findAllWithItemsOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<Order> getRecentOrdersWithItems(int limit) {
        List<Long> ids = orderRepo.findRecentIds(PageRequest.of(0, limit));
        if (ids.isEmpty()) return java.util.Collections.emptyList();
        return orderRepo.findByIdsWithItems(ids);
    }

    public Page<Order> getAllOrders(int page, int size) {
        return orderRepo.findAllByOrderByCreatedAtDesc(
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }
}
