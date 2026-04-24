package com.luxshop.scheduler;

import com.luxshop.repository.PointDailyLimitRepository;
import com.luxshop.service.PointsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * ╔══════════════════════════════════════════════════════════╗
 *  KOSMICA — PointsExpirationJob.java
 *
 *  Jobs programados para mantenimiento del sistema de puntos.
 *
 *  Para activar: añadir @EnableScheduling en LuxShopApplication.java
 *
 *  Crons:
 *    expireOldPoints()  → todos los días a las 02:00 AM
 *    cleanupDailyLimits → todos los domingos a las 03:00 AM
 * ╚══════════════════════════════════════════════════════════╝
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PointsExpirationJob {

    private final PointsService              pointsService;
    private final PointDailyLimitRepository  dailyLimitRepo;

    /**
     * Expira puntos cuya fecha de expiración ya pasó.
     * Se ejecuta a las 02:00 AM hora Colombia (UTC-5) todos los días.
     *
     * Cron: segundo minuto hora díaMes mes díaSemana
     * "0 0 7 * * *"  → 02:00 AM COT = 07:00 UTC
     */
    @Scheduled(cron = "0 0 7 * * *", zone = "UTC")
    public void expireOldPoints() {
        log.info("[POINTS JOB] Iniciando expiración de puntos — {}",
            LocalDateTime.now());

        try {
            int totalExpired = pointsService.expireOldPoints();

            if (totalExpired > 0) {
                log.info("[POINTS JOB] Expiración completada: {} puntos expirados", totalExpired);
            } else {
                log.info("[POINTS JOB] Expiración completada: sin puntos por expirar");
            }
        } catch (Exception e) {
            log.error("[POINTS JOB] Error en expiración de puntos: {}", e.getMessage(), e);
            // No relanzar: el job no debe tumbar el proceso si hay un error puntual
        }
    }

    /**
     * Limpia registros de point_daily_limits anteriores a 7 días.
     * Solo son útiles para el día actual; después son basura.
     * Se ejecuta los domingos a las 03:00 AM COT (08:00 UTC).
     */
    @Scheduled(cron = "0 0 8 * * SUN", zone = "UTC")
    public void cleanupOldDailyLimits() {
        LocalDate cutoff = LocalDate.now().minusDays(7);
        try {
            int deleted = dailyLimitRepo.deleteOlderThan(cutoff);
            log.info("[POINTS JOB] Limpieza diarios: {} registros eliminados (antes de {})",
                deleted, cutoff);
        } catch (Exception e) {
            log.error("[POINTS JOB] Error en limpieza de límites diarios: {}", e.getMessage(), e);
        }
    }
}
