package com.luxshop.repository;

import com.luxshop.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    // Reseñas aprobadas de un producto, más recientes primero
    Page<Review> findByProductIdAndApprovedTrueOrderByCreatedAtDesc(Long productId, Pageable pageable);

    // Todas las reseñas de un producto (admin)
    List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);

    // Promedio de rating de un producto
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.productId = :pid AND r.approved = true")
    Double avgRatingByProduct(@Param("pid") Long productId);

    // Conteo de reseñas aprobadas
    long countByProductIdAndApprovedTrue(Long productId);

    // Distribución de estrellas (1-5) para la barra de porcentajes
    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.productId = :pid AND r.approved = true GROUP BY r.rating")
    List<Object[]> ratingDistribution(@Param("pid") Long productId);

    // Verificar si el email ya reseñó este producto
    boolean existsByProductIdAndUserEmail(Long productId, String userEmail);
}
