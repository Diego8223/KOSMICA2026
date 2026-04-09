package com.luxshop.service;

import com.luxshop.model.Product;
import com.luxshop.model.Review;
import com.luxshop.repository.ProductRepository;
import com.luxshop.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepo;
    private final ProductRepository productRepo;

    // ── Obtener reseñas paginadas de un producto ─────────────────
    public Page<Review> getReviews(Long productId, int page, int size) {
        return reviewRepo.findByProductIdAndApprovedTrueOrderByCreatedAtDesc(
            productId, PageRequest.of(page, size)
        );
    }

    // ── Estadísticas: promedio + distribución de estrellas ───────
    public Map<String, Object> getStats(Long productId) {
        double avg   = reviewRepo.avgRatingByProduct(productId) != null
                       ? reviewRepo.avgRatingByProduct(productId) : 0.0;
        long   total = reviewRepo.countByProductIdAndApprovedTrue(productId);

        // Distribución: {5: 40, 4: 30, 3: 20, 2: 5, 1: 5}
        Map<Integer, Long> dist = new HashMap<>();
        for (int i = 1; i <= 5; i++) dist.put(i, 0L);
        reviewRepo.ratingDistribution(productId).forEach(row ->
            dist.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue())
        );

        Map<String, Object> result = new HashMap<>();
        result.put("average",      Math.round(avg * 10.0) / 10.0);
        result.put("total",        total);
        result.put("distribution", dist);
        return result;
    }

    // ── Crear reseña y actualizar rating del producto ────────────
    @Transactional
    public Review createReview(Long productId, Review review) {
        // Validar que el producto existe
        Product product = productRepo.findById(productId)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + productId));

        // Verificar si el usuario ya reseñó (por email)
        if (review.getUserEmail() != null && !review.getUserEmail().isBlank()) {
            if (reviewRepo.existsByProductIdAndUserEmail(productId, review.getUserEmail().toLowerCase().trim())) {
                throw new RuntimeException("Ya dejaste una reseña para este producto");
            }
            review.setUserEmail(review.getUserEmail().toLowerCase().trim());
        }

        // Sanear campos
        review.setProductId(productId);
        review.setApproved(true);  // Auto-aprobado; cambiar a false si quieres moderación
        review.setVerified(false);

        Review saved = reviewRepo.save(review);

        // Recalcular rating y reviewCount del producto
        updateProductRating(product, productId);

        log.info("⭐ Nueva reseña: producto {} | {} estrellas | {}", productId, review.getRating(), review.getUserName());
        return saved;
    }

    // ── Eliminar reseña (admin) ───────────────────────────────────
    @Transactional
    public void deleteReview(Long reviewId) {
        Review review = reviewRepo.findById(reviewId)
            .orElseThrow(() -> new RuntimeException("Reseña no encontrada"));
        Long productId = review.getProductId();
        reviewRepo.deleteById(reviewId);
        // Recalcular rating
        productRepo.findById(productId).ifPresent(p -> updateProductRating(p, productId));
    }

    // ── Aprobar/rechazar reseña (admin) ──────────────────────────
    @Transactional
    public Review moderateReview(Long reviewId, boolean approved) {
        Review review = reviewRepo.findById(reviewId)
            .orElseThrow(() -> new RuntimeException("Reseña no encontrada"));
        review.setApproved(approved);
        Review saved = reviewRepo.save(review);
        productRepo.findById(review.getProductId()).ifPresent(p ->
            updateProductRating(p, review.getProductId())
        );
        return saved;
    }

    // ── Recalcular rating y conteo del producto ──────────────────
    private void updateProductRating(Product product, Long productId) {
        Double avg   = reviewRepo.avgRatingByProduct(productId);
        long   count = reviewRepo.countByProductIdAndApprovedTrue(productId);

        product.setRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
        product.setReviewCount((int) count);
        productRepo.save(product);
    }

    // ── Todas las reseñas de un producto (admin) ─────────────────
    public List<Review> getAllReviews(Long productId) {
        return reviewRepo.findByProductIdOrderByCreatedAtDesc(productId);
    }
}
