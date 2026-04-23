package com.luxshop.service;

import com.luxshop.dto.OrderRequest;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository   orderRepo;
    private final ProductRepository productRepo;
    private final EmailService      emailService;
    private final ReferralService   referralService;
    private final UserService       userService;

    // ════════════════════════════════════════════════════════════
    //  CREAR PEDIDO
    //
    //  ✅ FIX: Ahora se envía email al cliente Y al admin en cuanto
    //  se crea el pedido (PENDING), sin esperar el webhook.
    //  Cuando el webhook confirme PAID, se envía una segunda
    //  confirmación de "pago recibido" al cliente.
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

        // Guardar items — NO descontar stock todavía
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
            items.add(oi);
            subtotal = subtotal.add(oi.getSubtotal());
        }

        BigDecimal shipping = req.getShippingCost() != null ? req.getShippingCost() : BigDecimal.ZERO;
        BigDecimal discount = req.getCouponDiscount() != null ? req.getCouponDiscount() : BigDecimal.ZERO;
        BigDecimal giftDisc = req.getGiftCardDiscount() != null ? req.getGiftCardDiscount() : BigDecimal.ZERO;

        order.setItems(items);
        order.setSubtotal(subtotal);
        order.setShippingCost(shipping);
        order.setTotal(subtotal.subtract(discount).subtract(giftDisc).add(shipping));

        Order saved = orderRepo.save(order);
        log.info("📋 Pedido PENDIENTE creado: {} | Total: {} | Pago: {}",
            saved.getOrderNumber(), saved.getTotal(), saved.getPaymentMethod());

        // ✅ FIX PRINCIPAL: Enviar email inmediatamente al crear el pedido
        // El cliente recibe el número de pedido y el admin es notificado
        try {
            emailService.sendOrderConfirmation(saved);
            log.info("✉️ Email de pedido {} enviado al cliente y admin", saved.getOrderNumber());
        } catch (Exception e) {
            // El email no debe bloquear la creación del pedido
            log.warn("⚠️ Email de pedido no enviado para {}: {}", saved.getOrderNumber(), e.getMessage());
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

        // ✅ Cuando el webhook confirma PAID: descontar stock, referidos, puntos
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
            if (saved.getCustomerEmail() != null && !saved.getCustomerEmail().isBlank()
                    && saved.getTotal() != null) {
                try {
                    userService.awardPurchasePoints(
                        saved.getCustomerEmail(),
                        saved.getTotal().intValue()
                    );
                    log.info("💎 Puntos acreditados para pedido {}", saved.getOrderNumber());
                } catch (Exception e) {
                    log.warn("No se pudieron acreditar puntos para {}: {}",
                        saved.getCustomerEmail(), e.getMessage());
                }
            }

            // ✅ Nota: NO se reenvía el email de confirmación aquí porque
            // ya se envió al crear el pedido. Si quieres una segunda
            // notificación de "pago confirmado", descomenta esto:
            //
            // try {
            //     emailService.sendStatusUpdate(saved); // enviará PAID si agregas ese case
            // } catch (Exception e) {
            //     log.warn("Email de pago confirmado no enviado: {}", e.getMessage());
            // }

        } else if (newStatus != Order.Status.PAID && newStatus != Order.Status.PENDING) {
            // Para cambios de estado posteriores (PROCESSING, SHIPPED, DELIVERED, CANCELLED)
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
