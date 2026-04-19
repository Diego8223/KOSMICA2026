// ── ProductRepository.java ───────────────────────────────
package com.luxshop.repository;

import com.luxshop.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // ✅ FIX: category ahora es String — compatible con VARCHAR(100) en Postgres
    Page<Product> findByCategoryAndActiveTrue(String category, Pageable pageable);

    List<Product> findByActiveTrue();

    // ✅ FIX: ordenar por createdAt ya que reviewCount fue eliminado del modelo
    List<Product> findTop8ByActiveTrueOrderByCreatedAtDesc();

    // FIX: 'featured' no existe en Product — devuelve los 8 más recientes activos
    @Query("SELECT p FROM Product p WHERE p.active = true ORDER BY p.createdAt DESC")
    List<Product> findByFeaturedTrueAndActiveTrue();

    @Query("SELECT p FROM Product p WHERE p.active = true AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Product> search(@Param("q") String query, Pageable pageable);
}
