package com.luxshop.service;

import com.luxshop.exception.EntityNotFoundException;
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

    public Page<Review> getReviews(Long productId, int page, int size) {
        return reviewRepo.findByProductIdAndApprovedTrueOrderByCreatedAtDesc(
            productId, PageRequest.of(page, size)
        );
    }

    public Map<String, Object> getStats(Long productId) {
        // FIX: antes se llamaba avgRatingByProduct(productId) DOS veces:
        //   double avg = reviewRepo.avgRatingByProduct(productId) != null
        //                ? reviewRepo.avgRatingByProduct(productId) : 0.0;
        // Eso hacía dos queries idénticas a la BD. Ahora se llama UNA sola vez
        // y se guarda el resultado en una variable local.
        Double rawAvg = reviewRepo.avgRatingByProduct(productId);
        double avg    = rawAvg != null ? rawAvg : 0.0;
        long   total  = reviewRepo.countByProductIdAndApprovedTrue(productId);

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

    @Transactional
    public Review createReview(Long productId, Review review) {
        Product product = productRepo.findById(productId)
            .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado: " + productId));

        if (review.getUserEmail() != null && !review.getUserEmail().isBlank()) {
            if (reviewRepo.existsByProductIdAndUserEmail(
                    productId, review.getUserEmail().toLowerCase().trim())) {
                throw new IllegalArgumentException("Ya dejaste una reseña para este producto");
            }
            review.setUserEmail(review.getUserEmail().toLowerCase().trim());
        }

        review.setProductId(productId);
        review.setApproved(true);
        review.setVerified(false);

        Review saved = reviewRepo.save(review);
        updateProductRating(product, productId);

        log.info("⭐ Nueva reseña: producto {} | {} estrellas | {}",
            productId, review.getRating(), review.getUserName());
        return saved;
    }

    @Transactional
    public void deleteReview(Long reviewId) {
        Review review = reviewRepo.findById(reviewId)
            .orElseThrow(() -> new EntityNotFoundException("Reseña no encontrada"));
        Long productId = review.getProductId();
        reviewRepo.deleteById(reviewId);
        productRepo.findById(productId).ifPresent(p -> updateProductRating(p, productId));
    }

    @Transactional
    public Review moderateReview(Long reviewId, boolean approved) {
        Review review = reviewRepo.findById(reviewId)
            .orElseThrow(() -> new EntityNotFoundException("Reseña no encontrada"));
        review.setApproved(approved);
        Review saved = reviewRepo.save(review);
        productRepo.findById(review.getProductId()).ifPresent(p ->
            updateProductRating(p, review.getProductId())
        );
        return saved;
    }

    private void updateProductRating(Product product, Long productId) {
        Double avg   = reviewRepo.avgRatingByProduct(productId);
        long   count = reviewRepo.countByProductIdAndApprovedTrue(productId);
        product.setRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
        product.setReviewCount((int) count);
        productRepo.save(product);
    }

    public List<Review> getAllReviews(Long productId) {
        return reviewRepo.findByProductIdOrderByCreatedAtDesc(productId);
    }
}
