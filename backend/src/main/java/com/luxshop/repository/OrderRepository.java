package com.luxshop.repository;

import com.luxshop.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    Optional<Order> findByPaymentId(String paymentId);

    List<Order> findByCustomerEmailOrderByCreatedAtDesc(String email);

    // JOIN FETCH evita el problema N+1: carga orders + items en una sola query
    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items i LEFT JOIN FETCH i.product ORDER BY o.createdAt DESC")
    List<Order> findAllWithItemsOrderByCreatedAtDesc();

    // Mantener este método para compatibilidad con otros usos
    List<Order> findAllByOrderByCreatedAtDesc();
}
