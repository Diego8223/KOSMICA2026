// ── OrderRepository.java ─────────────────────────────────
package com.luxshop.repository;

import com.luxshop.model.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    List<Order> findByCustomerEmailOrderByCreatedAtDesc(String email);

    // ✅ FIX: JOIN FETCH carga los items en la misma query — evita LazyInitializationException
    // Se necesitan dos queries separadas para paginación con JOIN FETCH
    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items ORDER BY o.createdAt DESC")
    List<Order> findAllWithItems();

    @Query(value = "SELECT o FROM Order o ORDER BY o.createdAt DESC",
           countQuery = "SELECT COUNT(o) FROM Order o")
    Page<Order> findAllPaged(Pageable pageable);
}
