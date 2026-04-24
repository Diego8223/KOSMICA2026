package com.luxshop.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

/**
 * ✅ PARCHE v2 — Campos añadidos:
 *
 *  + pointsToRedeem  → puntos que el cliente quiere canjear (null = no usa puntos)
 *
 * El backend valida que el canje sea válido antes de aplicarlo.
 * El frontend envía este campo solo si el usuario activó el canje de puntos.
 * Resto del archivo sin cambios.
 */
@Data
public class OrderRequest {

    @NotBlank(message = "Nombre requerido")
    private String name;

    @Email(message = "Email inválido")
    @NotBlank(message = "Email requerido")
    private String email;

    private String phone;
    private String document;
    private String city;
    private String neighborhood;
    private String notes;

    @NotBlank(message = "Dirección requerida")
    private String address;

    private String paymentMethod = "MERCADOPAGO";
    private String paymentIntentId;

    private String shippingMethod;

    private BigDecimal shippingCost = BigDecimal.ZERO;

    private String couponCode;

    private BigDecimal couponDiscount;

    private String referralCode;

    private String     giftCardCode;
    private BigDecimal giftCardDiscount;

    // ✅ NUEVO — puntos a canjear en este pedido
    /**
     * Puntos que el cliente quiere canjear como descuento.
     * null o 0 = no usa puntos.
     * El backend valida: mínimo 500 pts, pedido >= $50.000, máximo 30% del total.
     */
    private Integer pointsToRedeem;

    @Valid
    @NotEmpty(message = "El carrito está vacío")
    private List<ItemDto> items;

    @Data
    public static class ItemDto {
        @NotNull
        private Long productId;

        @Min(value = 1, message = "Cantidad mínima: 1")
        private Integer quantity;
    }
}
