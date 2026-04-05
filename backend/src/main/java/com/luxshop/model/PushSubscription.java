package com.luxshop.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Guarda cada suscripción push de un cliente.
 * Tabla: push_subscriptions
 */
@Data
@Entity
@Table(name = "push_subscriptions")
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Endpoint único del navegador del cliente
    @Column(nullable = false, unique = true, length = 500)
    private String endpoint;

    // Claves de la suscripción (formato JSON del browser)
    @Column(nullable = false, length = 255)
    private String p256dh;   // clave pública del cliente

    @Column(nullable = false, length = 255)
    private String auth;     // secreto de autenticación

    // Email opcional — si el cliente lo proporciona al suscribirse
    @Column(length = 150)
    private String email;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Si el endpoint ya no es válido (error 410 del navegador)
    private boolean active = true;
}
