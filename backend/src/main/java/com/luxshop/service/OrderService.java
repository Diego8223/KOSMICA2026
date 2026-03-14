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

    // ── Crear pedido + email confirmación ─────────────────────
    @Transactional
    public Order createOrder(OrderRequest req) {
        Order order = new Order();
        order.setCustomerName(req.getName());
        order.setCustomerEmail(req.getEmail());
        order.setShippingAddress(req.getAddress());
        order.setPaymentMethod(req.getPaymentMethod());
        order.setPaymentId(req.getPaymentIntentId());   // Order.java usa "paymentId"
        order.setStatus(Order.Status.PAID);              // Order.Status (inner enum)

        List<OrderItem> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderRequest.ItemDto item : req.getItems()) {  // ItemDto (no ItemRequest)
            Product product = productRepo.findById(item.getProductId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + item.getProductId()));

            if (product.getStock() < item.getQuantity())
                throw new RuntimeException("Stock insuficiente: " + product.getName());

            // Reducir stock
            product.setStock(product.getStock() - item.getQuantity());
            productRepo.save(product);

            // Construir OrderItem con campos reales del modelo
            OrderItem oi = new OrderItem();
            oi.setOrder(order);
            oi.setProduct(product);
            oi.setQuantity(item.getQuantity());
            oi.setUnitPrice(product.getPrice());         // OrderItem.unitPrice (BigDecimal)
            oi.setSubtotal(product.getPrice()
                .multiply(BigDecimal.valueOf(item.getQuantity())));
            items.add(oi);

            subtotal = subtotal.add(oi.getSubtotal());
        }

        // Envío gratis >= $80, sino 8%
        BigDecimal shipping = subtotal.compareTo(new BigDecimal("80")) >= 0
            ? BigDecimal.ZERO
            : subtotal.multiply(new BigDecimal("0.08")).setScale(2, java.math.RoundingMode.HALF_UP);

        order.setItems(items);
        order.setSubtotal(subtotal);                    // Order.java tiene subtotal
        order.setShippingCost(shipping);                // Order.java tiene shippingCost
        order.setTotal(subtotal.add(shipping));         // BigDecimal (no double)

        Order saved = orderRepo.save(order);
        log.info("Pedido creado: {}", saved.getOrderNumber());

        // ✉️ Email al cliente y notificación al admin
        try { emailService.sendOrderConfirmation(saved); }
        catch (Exception e) { log.warn("Email no enviado: {}", e.getMessage()); }

        return saved;
    }

    // ── Actualizar estado + email de seguimiento ──────────────
    @Transactional
    public Order updateStatus(Long orderId, Order.Status status) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado: " + orderId));

        order.setStatus(status);
        Order saved = orderRepo.save(order);

        // ✉️ Email al cliente
        try { emailService.sendStatusUpdate(saved); }
        catch (Exception e) { log.warn("Email de estado no enviado: {}", e.getMessage()); }

        return saved;
    }

    // ── Consultas ─────────────────────────────────────────────
    public Optional<Order> findByNumber(String orderNumber) {
        return orderRepo.findByOrderNumber(orderNumber);
    }

    public List<Order> getOrdersByEmail(String email) {
        return orderRepo.findByCustomerEmailOrderByCreatedAtDesc(email);
    }

    public Page<Order> getAllOrders(int page, int size) {
        return orderRepo.findAll(
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }
}
