package com.luxshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.luxshop.model.PointDailyLimit;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface PointDailyLimitRepository extends JpaRepository<PointDailyLimit, Long> {

    Optional<PointDailyLimit> findByUserEmailAndLimitDate(String userEmail, LocalDate limitDate);

    /**
     * Suma los puntos ganados hoy por compras para un usuario.
     * Devuelve 0 si aún no hay registro.
     */
    @Query("""
        SELECT COALESCE(pdl.pointsEarned, 0)
        FROM   PointDailyLimit pdl
        WHERE  pdl.userEmail = :email
          AND  pdl.limitDate = :date
    """)
    int getEarnedToday(@Param("email") String email, @Param("date") LocalDate date);

    /**
     * Incrementa (upsert) el contador diario del usuario.
     * Usa INSERT ... ON CONFLICT para ser atómica.
     */
    @Modifying
    @Query(value = """
        INSERT INTO point_daily_limits (user_email, limit_date, points_earned)
        VALUES (:email, :date, :points)
        ON CONFLICT (user_email, limit_date)
        DO UPDATE SET points_earned = point_daily_limits.points_earned + :points
    """, nativeQuery = true)
    void upsertDailyPoints(@Param("email") String email,
                           @Param("date") LocalDate date,
                           @Param("points") int points);

    /** Elimina registros anteriores a N días (limpieza periódica). */
    @Modifying
    @Query("DELETE FROM PointDailyLimit pdl WHERE pdl.limitDate < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDate cutoff);
}
