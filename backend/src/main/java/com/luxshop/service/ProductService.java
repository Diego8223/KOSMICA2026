// ── ProductService.java ──────────────────────────────────
package com.luxshop.service;

import com.luxshop.model.Category;
import com.luxshop.model.Product;
import com.luxshop.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepo;

    @Value("${app.upload.dir:uploads/}")
    private String uploadDir;

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

    public String uploadFile(MultipartFile file) throws IOException {
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename()
            .replaceAll("[^a-zA-Z0-9._-]", "_");
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);
        Files.write(uploadPath.resolve(filename), file.getBytes());
        return "/uploads/" + filename;
    }
}
