package com.luxshop.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FIX: EAGER evita LazyInitializationException cuando Jackson serializa
    // fuera de la sesión de Hibernate. @JsonIgnore rompe la recursión infinita
    // Order → items → order → items...
    @JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private Integer quantity;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(precision = 10, scale = 2)
    private BigDecimal subtotal;

    /** Color que el cliente eligió al comprar este ítem. Null si el producto no tiene colores. */
    @Column(name = "selected_color", length = 100)
    private String selectedColor;

    /** URL de la foto del color elegido — se usa en correo de confirmación. */
    @Column(name = "selected_color_image", length = 500)
    private String selectedColorImage;
}
