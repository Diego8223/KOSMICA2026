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

    List<Order> findByCustomerEmailOrderByCreatedAtDesc(String email);

    // ✅ FIX: Sin DISTINCT para evitar error con columna JSON de products
    // Usamos subquery para traer solo los orders y luego Hibernate carga los items por EAGER
    @Query("SELECT o FROM Order o ORDER BY o.createdAt DESC")
    List<Order> findAllWithItems();
}
