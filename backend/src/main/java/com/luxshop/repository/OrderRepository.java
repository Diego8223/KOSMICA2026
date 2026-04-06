package com.luxshop.repository;

import com.luxshop.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    // FIX: buscar por paymentId para el webhook de MercadoPago
    Optional<Order> findByPaymentId(String paymentId);

    List<Order> findByCustomerEmailOrderByCreatedAtDesc(String email);

    // ✅ FIX DEFINITIVO: trae orders ordenados, EAGER carga items automáticamente
    List<Order> findAllByOrderByCreatedAtDesc();
}
