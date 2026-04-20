package com.luxshop.repository;

import com.luxshop.model.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    Optional<Order> findByPaymentId(String paymentId);

    List<Order> findByCustomerEmailOrderByCreatedAtDesc(String email);

    // ✅ FIX: paginacion nativa en DB — ya no carga todos en memoria
    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // Para exportar todos (panel admin) — igual que antes
    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items i LEFT JOIN FETCH i.product ORDER BY o.createdAt DESC")
    List<Order> findAllWithItemsOrderByCreatedAtDesc();

    // Mantener para compatibilidad
    List<Order> findAllByOrderByCreatedAtDesc();
}
