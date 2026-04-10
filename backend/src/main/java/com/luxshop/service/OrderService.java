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
import org.springframework.data.domain.PageImpl;
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

    // ════════════════════════════════════════════════════════════
    //  CREAR PEDIDO — estado PENDING (no descuenta stock todavía)
    //
    //  El stock y los emails se aplican SOLO cuando el webhook de
    //  MercadoPago o Wompi confirma el pago (updateStatus → PAID).
    //  Esto evita:
    //    - Pedidos "fantasma" sin pago real
    //    - Stock descontado por pedidos abandonados
    //    - Emails de confirmación por pedidos no pagados
    // ════════════════════════════════════════════════════════════
    @Transactional
    public Order createOrder(OrderRequest req) {
        Order order = new Order();
        order.setCustomerName(req.getName());
        order.setCustomerEmail(req.getEmail());
        order.setShippingAddress(req.getAddress());
        order.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "MERCADOPAGO");
        order.setPaymentId(req.getPaymentIntentId());

        // ✅ PENDIENTE hasta que el webhook confirme el pago
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

        // ✅ Solo guardar los items con precios — NO descontar stock aquí
        List<OrderItem> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderRequest.ItemDto item : req.getItems()) {
            Product product = productRepo.findById(item.getProductId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + item.getProductId()));

            // Validar stock sin descontarlo todavía
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

        // ✅ NO enviamos email ni WhatsApp aquí — se envía cuando sea PAID
        return saved;
    }

    // ════════════════════════════════════════════════════════════
    //  ACTUALIZAR ESTADO — aquí sí se descuenta stock y se notifica
    //
    //  Cuando el webhook confirma PAID:
    //    1. Se descuenta el stock de cada producto
    //    2. Se redime el código de referido
    //    3. Se envía email de confirmación al cliente
    //    4. Se envía alerta WhatsApp al admin
    // ════════════════════════════════════════════════════════════
    @Transactional
    public Order updateStatus(Long orderId, Order.Status newStatus) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado: " + orderId));

        Order.Status prevStatus = order.getStatus();
        order.setStatus(newStatus);
        Order saved = orderRepo.save(order);

        log.info("🔄 Pedido {} cambió de {} a {}", saved.getOrderNumber(), prevStatus, newStatus);

        // ✅ Solo al confirmar el pago (PENDING → PAID) descontamos stock y notificamos
        if (newStatus == Order.Status.PAID && prevStatus == Order.Status.PENDING) {
            log.info("💳 Pago confirmado para pedido {} — procesando...", saved.getOrderNumber());

            // 1. Descontar stock
            if (saved.getItems() != null) {
                for (OrderItem item : saved.getItems()) {
                    Product product = item.getProduct();
                    if (product != null) {
                        int newStock = Math.max(0, product.getStock() - item.getQuantity());
                        product.setStock(newStock);
                        productRepo.save(product);
                        log.info("📦 Stock actualizado: {} → {} unidades", product.getName(), newStock);
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

            // 3. Enviar confirmación al cliente y alerta al admin
            try {
                emailService.sendOrderConfirmation(saved);
                log.info("✉️ Confirmación enviada para pedido {}", saved.getOrderNumber());
            } catch (Exception e) {
                log.warn("Email de confirmación no enviado para {}: {}", saved.getOrderNumber(), e.getMessage());
            }

        } else if (newStatus != Order.Status.PAID) {
            // Para cambios de estado posteriores (PROCESSING, SHIPPED, DELIVERED, CANCELLED)
            try {
                emailService.sendStatusUpdate(saved);
            } catch (Exception e) {
                log.warn("Email de estado no enviado: {}", e.getMessage());
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
    public Page<Order> getAllOrders(int page, int size) {
        List<Order> allOrders = orderRepo.findAllByOrderByCreatedAtDesc();
        log.info("📦 Total pedidos: {}", allOrders.size());
        int total = allOrders.size();
        int from  = Math.min(page * size, total);
        int to    = Math.min(from + size, total);
        return new PageImpl<>(
            allOrders.subList(from, to),
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")),
            total
        );
    }
}
