// ── ProductService.java ──────────────────────────────────
package com.luxshop.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.luxshop.model.Category;
import com.luxshop.model.Product;
import com.luxshop.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepo;

    @Value("${cloudinary.url:}")
    private String cloudinaryUrl;

    // ── Consultas ────────────────────────────────────────
    public Page<Product> getByCategory(Category category, int page, int size) {
        return productRepo.findByCategoryAndActiveTrue(
            category, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "reviewCount")));
    }

    public List<Product> getAll() {
        return productRepo.findByActiveTrue();
    }

    public List<Product> getFeatured() {
        return productRepo.findTop8ByActiveTrueOrderByReviewCountDesc();
    }

    public Page<Product> search(String query, int page, int size) {
        return productRepo.search(query, PageRequest.of(page, size));
    }

    public Optional<Product> findById(Long id) {
        return productRepo.findById(id);
    }

    public Product save(Product product) {
        return productRepo.save(product);
    }

    public void delete(Long id) {
        productRepo.findById(id).ifPresent(p -> {
            p.setActive(false);
            productRepo.save(p);
        });
    }

    // ── Subir archivo a Cloudinary ────────────────────────
    // La URL permanente queda guardada en la base de datos.
    // Nunca se pierde aunque Render reinicie.
    public String uploadFile(MultipartFile file) throws IOException {
        if (cloudinaryUrl == null || cloudinaryUrl.isBlank()) {
            throw new IOException(
                "CLOUDINARY_URL no configurada. " +
                "Agrégala en Render → kosmica-backend → Environment Variables"
            );
        }

        try {
            Cloudinary cloudinary = new Cloudinary(cloudinaryUrl);
            cloudinary.config.secure = true;

            // Detectar si es video o imagen
            String contentType = file.getContentType() != null ? file.getContentType() : "";
            boolean isVideo = contentType.startsWith("video/");

            Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                    "folder",       "kosmica",
                    "resource_type", isVideo ? "video" : "image",
                    "public_id",     "kosmica_" + UUID.randomUUID().toString().replace("-","").substring(0,12)
                )
            );

            String url = (String) result.get("secure_url");
            log.info("✅ Subido a Cloudinary: {}", url);
            return url;

        } catch (Exception e) {
            log.error("Error subiendo a Cloudinary: {}", e.getMessage());
            throw new IOException("Error al subir archivo: " + e.getMessage());
        }
    }
}
