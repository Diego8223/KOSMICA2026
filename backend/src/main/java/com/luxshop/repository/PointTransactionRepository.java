package com.luxshop.repository;

import com.luxshop.model.PointTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {

    /** Historial completo del usuario, más reciente primero. */
    List<PointTransaction> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    /** Historial paginado (últimas N transacciones). */
    @Query("""
        SELECT pt FROM PointTransaction pt
        WHERE  pt.userEmail = :email
        ORDER BY pt.createdAt DESC
        LIMIT  :limit
    """)
    List<PointTransaction> findRecentByEmail(@Param("email") String email,
                                             @Param("limit") int limit);

    /**
     * Lotes de puntos disponibles que ya expiraron y aún tienen saldo.
     * Se usa para el job de expiración.
     */
    @Query("""
        SELECT pt FROM PointTransaction pt
        WHERE  pt.userEmail       = :email
          AND  pt.points          > 0
          AND  pt.pointsRemaining > 0
          AND  pt.expiresAt      IS NOT NULL
          AND  pt.expiresAt       < :now
        ORDER BY pt.expiresAt ASC
    """)
    List<PointTransaction> findExpiredBatches(@Param("email") String email,
                                              @Param("now") LocalDateTime now);

    /**
     * Lotes disponibles para consumir en un canje (FIFO por fecha de expiración).
     * Primero los que expiran antes.
     */
    @Query("""
        SELECT pt FROM PointTransaction pt
        WHERE  pt.userEmail       = :email
          AND  pt.points          > 0
          AND  pt.pointsRemaining > 0
          AND  (pt.expiresAt IS NULL OR pt.expiresAt > :now)
        ORDER BY COALESCE(pt.expiresAt, CAST('9999-12-31' AS java.time.LocalDateTime)) ASC,
                 pt.createdAt ASC
    """)
    List<PointTransaction> findAvailableBatchesForRedeem(@Param("email") String email,
                                                         @Param("now") LocalDateTime now);

    /**
     * Suma total de puntos disponibles (no expirados).
     * ¡IMPORTANTE! Este valor debe coincidir con users.points.
     * Se usa como doble verificación (reconciliación).
     */
    @Query("""
        SELECT COALESCE(SUM(pt.pointsRemaining), 0) FROM PointTransaction pt
        WHERE  pt.userEmail = :email
          AND  pt.points    > 0
          AND  (pt.expiresAt IS NULL OR pt.expiresAt > :now)
    """)
    int sumAvailablePoints(@Param("email") String email,
                           @Param("now") LocalDateTime now);

    /**
     * Puntos que expiran en los próximos N días.
     */
    @Query("""
        SELECT COALESCE(SUM(pt.pointsRemaining), 0) FROM PointTransaction pt
        WHERE  pt.userEmail  = :email
          AND  pt.expiresAt  IS NOT NULL
          AND  pt.expiresAt  BETWEEN :now AND :deadline
          AND  pt.pointsRemaining > 0
    """)
    int sumPointsExpiringSoon(@Param("email") String email,
                              @Param("now") LocalDateTime now,
                              @Param("deadline") LocalDateTime deadline);

    /** Actualiza saldo disponible de un lote específico. */
    @Modifying
    @Query("UPDATE PointTransaction pt SET pt.pointsRemaining = :remaining WHERE pt.id = :id")
    void updatePointsRemaining(@Param("id") Long id, @Param("remaining") int remaining);
}
