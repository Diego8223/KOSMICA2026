// ── ProductRepository.java ───────────────────────────────
package com.luxshop.repository;

import com.luxshop.model.Category;
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

    // FIX: category es enum Category en el modelo Product
    Page<Product> findByCategoryAndActiveTrue(Category category, Pageable pageable);

    List<Product> findByActiveTrue();

    List<Product> findTop8ByActiveTrueOrderByCreatedAtDesc();

    // FIX: 'featured' no existe en Product — devuelve los más recientes activos
    @Query("SELECT p FROM Product p WHERE p.active = true ORDER BY p.createdAt DESC")
    List<Product> findByFeaturedTrueAndActiveTrue();

    @Query("SELECT p FROM Product p WHERE p.active = true AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Product> search(@Param("q") String query, Pageable pageable);
}
