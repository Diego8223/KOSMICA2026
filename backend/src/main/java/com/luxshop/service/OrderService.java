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

    @Transactional
    public Order createOrder(OrderRequest req) {
        Order order = new Order();
        order.setCustomerName(req.getName());
        order.setCustomerEmail(req.getEmail());
        order.setShippingAddress(req.getAddress());
        order.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "MERCADOPAGO");
        order.setPaymentId(req.getPaymentIntentId());
        order.setStatus(Order.Status.PAID);
        order.setPhone(req.getPhone());
        order.setDocument(req.getDocument());
        order.setCity(req.getCity());
        order.setNeighborhood(req.getNeighborhood());
        order.setNotes(req.getNotes());

        // ✅ CUPÓN — guardar código usado y monto descontado
        if (req.getCouponCode() != null && !req.getCouponCode().isBlank()) {
            order.setCouponCode(req.getCouponCode().toUpperCase());
        }
        if (req.getCouponDiscount() != null) {
            order.setCouponDiscount(req.getCouponDiscount());
        }

        // ✅ REFERIDO — validar, guardar y redimir código "Invita y Gana"
        if (req.getReferralCode() != null && !req.getReferralCode().isBlank()) {
            String refCode = req.getReferralCode().toUpperCase().trim();
            // Doble validación: el receptor no puede ser el dueño del código
            var validation = referralService.validateCode(refCode, req.getEmail());
            if (Boolean.TRUE.equals(validation.get("valid"))) {
                order.setReferralCode(refCode);
                log.info("🎁 Compra referida por código: {}", refCode);
                // La redención real se hace después de guardar el pedido (ver abajo)
            } else {
                log.warn("⚠️  Código de referido inválido '{}': {}", refCode, validation.get("message"));
                // No bloqueamos la compra, solo ignoramos el código inválido
                req.setReferralCode(null);
                if (req.getCouponDiscount() != null) {
                    // Si el descuento venía del referido, lo anulamos
                    order.setCouponDiscount(BigDecimal.ZERO);
                    req.setCouponDiscount(BigDecimal.ZERO);
                }
            }
        }

        List<OrderItem> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderRequest.ItemDto item : req.getItems()) {
            Product product = productRepo.findById(item.getProductId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + item.getProductId()));

            if (product.getStock() < item.getQuantity())
                throw new RuntimeException("Stock insuficiente: " + product.getName());

            product.setStock(product.getStock() - item.getQuantity());
            productRepo.save(product);

            OrderItem oi = new OrderItem();
            oi.setOrder(order);
            oi.setProduct(product);
            oi.setQuantity(item.getQuantity());
            oi.setUnitPrice(product.getPrice());
            oi.setSubtotal(product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            items.add(oi);
            subtotal = subtotal.add(oi.getSubtotal());
        }

        // Envío desde el request (ya calculado en frontend por el asesor)
        BigDecimal shipping = req.getShippingCost() != null
            ? req.getShippingCost()
            : BigDecimal.ZERO;

        // Descuento del cupón
        BigDecimal discount = req.getCouponDiscount() != null
            ? req.getCouponDiscount()
            : BigDecimal.ZERO;

        order.setItems(items);
        order.setSubtotal(subtotal);
        order.setShippingCost(shipping);
        order.setTotal(subtotal.subtract(discount).add(shipping));

        Order saved = orderRepo.save(order);
        log.info("✅ Pedido creado: {} | Cupón: {} | Referido: {}",
            saved.getOrderNumber(),
            saved.getCouponCode() != null ? saved.getCouponCode() : "ninguno",
            saved.getReferralCode() != null ? saved.getReferralCode() : "directo");

        // ✅ REDIMIR código de referido ahora que el pedido está guardado
        if (saved.getReferralCode() != null) {
            try {
                boolean redeemed = referralService.redeemCode(
                    saved.getReferralCode(),
                    saved.getCustomerEmail(),
                    saved.getCustomerName(),
                    saved.getOrderNumber()
                );
                if (redeemed) {
                    log.info("🎉 Código {} redimido exitosamente en pedido {}",
                        saved.getReferralCode(), saved.getOrderNumber());
                }
            } catch (Exception e) {
                // No cancelamos el pedido si falla la redención — ya fue guardado
                log.error("Error redimiendo código de referido {}: {}",
                    saved.getReferralCode(), e.getMessage());
            }
        }

        try { emailService.sendOrderConfirmation(saved); }
        catch (Exception e) { log.warn("Email no enviado: {}", e.getMessage()); }

        return saved;
    }

    @Transactional
    public Order updateStatus(Long orderId, Order.Status status) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado: " + orderId));
        order.setStatus(status);
        Order saved = orderRepo.save(order);
        try { emailService.sendStatusUpdate(saved); }
        catch (Exception e) { log.warn("Email de estado no enviado: {}", e.getMessage()); }
        return saved;
    }

    public Optional<Order> findByNumber(String orderNumber) {
        return orderRepo.findByOrderNumber(orderNumber);
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
