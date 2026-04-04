package com.luxshop.controller;

import com.luxshop.model.Product;
import com.luxshop.service.ProductService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * ✅ SITEMAP DINÁMICO — Google indexa todas las páginas de Kosmica
 *
 * INSTRUCCIONES DE USO:
 * 1. Copiar este archivo a:
 *    backend/src/main/java/com/luxshop/controller/SitemapController.java
 * 2. Agregar en CorsConfig.java que /sitemap.xml sea público (sin autenticación)
 * 3. Reiniciar el backend → acceder a https://www.kosmica.com.co/sitemap.xml
 * 4. Subir la URL del sitemap en Google Search Console:
 *    search.google.com/search-console → Sitemaps → Agregar sitemap
 */
@RestController
public class SitemapController {

    private final ProductService productService;
    private static final String BASE_URL = "https://www.kosmica.com.co";

    public SitemapController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String sitemap() {
        String today = LocalDate.now().toString();

        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        // ── Homepage ──
        sb.append(url(BASE_URL + "/", "1.0", "daily", today));

        // ── Categorías ──
        String[] cats = {"BOLSOS", "BILLETERAS", "MAQUILLAJE", "CAPILAR", "CUIDADO_PERSONAL", "ACCESORIOS"};
        for (String cat : cats) {
            sb.append(url(BASE_URL + "/?categoria=" + cat, "0.8", "daily", today));
        }

        // ── Páginas estáticas ──
        sb.append(url(BASE_URL + "/?tracking=1",  "0.5", "monthly", today));
        sb.append(url(BASE_URL + "/?wishlist=1",  "0.5", "monthly", today));

        // ── Productos individuales ──
        try {
            List<Product> products = productService.getAllProducts();
            for (Product p : products) {
                if (p.getId() != null) {
                    sb.append(url(BASE_URL + "/?producto=" + p.getId(), "0.9", "weekly", today));
                }
            }
        } catch (Exception e) {
            // Si falla el DB, el sitemap igual se sirve con las páginas estáticas
        }

        sb.append("</urlset>");
        return sb.toString();
    }

    private String url(String loc, String priority, String changefreq, String lastmod) {
        return "  <url>\n" +
               "    <loc>" + loc + "</loc>\n" +
               "    <lastmod>" + lastmod + "</lastmod>\n" +
               "    <changefreq>" + changefreq + "</changefreq>\n" +
               "    <priority>" + priority + "</priority>\n" +
               "  </url>\n";
    }
}
