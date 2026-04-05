package com.luxshop.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

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