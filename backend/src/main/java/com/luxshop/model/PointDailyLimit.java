package com.luxshop.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

/**
 * Registro del total de puntos ganados POR COMPRAS en un día concreto.
 * Permite verificar y aplicar el límite diario de 500 pts de forma atómica.
 *
 * Separado de users para evitar race conditions en actualizaciones concurrentes.
 */
@Entity
@Table(name = "point_daily_limits",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_email", "limit_date"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointDailyLimit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email", nullable = false, length = 150)
    private String userEmail;

    @Column(name = "limit_date", nullable = false)
    private LocalDate limitDate;

    /** Puntos ganados POR COMPRAS en este día (nunca supera 500). */
    @Column(name = "points_earned", nullable = false)
    @Builder.Default
    private Integer pointsEarned = 0;
}
