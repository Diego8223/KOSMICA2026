package com.luxshop.service;

import com.luxshop.exception.EntityNotFoundException;
import com.luxshop.model.User;
import com.luxshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final EmailService   emailService;

    private static final int WELCOME_POINTS     = 20;
    private static final int DAILY_CHECKIN_PTS  = 5;
    private static final int DAILY_POINTS_LIMIT = 500;   // límite de puntos por compras POR DÍA
    private static final int REDEEM_MIN_POINTS  = 500;   // mínimo para canjear

    /**
     * Registra un usuario nuevo o actualiza sus datos si el email ya existe.
     * Al ser registro NUEVO: asigna 20 pts de bienvenida y envía email.
     */
    @Transactional
    public User registerOrUpdate(Map<String, Object> payload) {
        String email = ((String) payload.getOrDefault("email", "")).toLowerCase().trim();
        if (email.isEmpty()) throw new IllegalArgumentException("Email requerido");

        Optional<User> existing = userRepository.findByEmailIgnoreCase(email);
        boolean isNew = existing.isEmpty();
        User user = existing.orElse(new User());

        user.setEmail(email);
        user.setName((String) payload.getOrDefault("name", ""));
        user.setPhone((String) payload.getOrDefault("phone", ""));
        user.setDocument((String) payload.getOrDefault("document", ""));
        user.setCity((String) payload.getOrDefault("city", ""));
        user.setNeighborhood((String) payload.getOrDefault("neighborhood", ""));
        user.setAddress((String) payload.getOrDefault("address", ""));

        if (isNew) {
            user.setPoints(WELCOME_POINTS);
        }

        User saved = userRepository.save(user);
        log.info("Usuario {}: {} ({})", isNew ? "registrado" : "actualizado",
            saved.getName(), saved.getEmail());

        if (isNew) {
            try {
                emailService.sendWelcomeEmail(saved.getEmail(), saved.getName());
            } catch (Exception e) {
                log.warn("No se pudo enviar email de bienvenida a {}: {}",
                    saved.getEmail(), e.getMessage());
            }
        }

        return saved;
    }

    /**
     * Check-in diario: suma puntos y actualiza racha.
     * Racha >= 3 días: +5 bonus; >= 7 días: +10 bonus.
     * Si ya hizo check-in hoy: devuelve usuario sin cambios.
     * NOTA: el check-in NO cuenta para el límite diario de compras.
     */
    @Transactional
    public User doCheckin(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado: " + email));

        LocalDate today     = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        if (today.equals(user.getLastCheckinDate())) {
            log.info("Check-in ya registrado hoy para {}", email);
            return user;
        }

        int newStreak;
        if (yesterday.equals(user.getLastCheckinDate())) {
            newStreak = (user.getCheckinStreak() == null ? 0 : user.getCheckinStreak()) + 1;
        } else {
            newStreak = 1;
        }

        int bonus      = DAILY_CHECKIN_PTS + (newStreak >= 7 ? 10 : newStreak >= 3 ? 5 : 0);
        int currentPts = user.getPoints() == null ? 0 : user.getPoints();
        user.setPoints(currentPts + bonus);
        user.setCheckinStreak(newStreak);
        user.setLastCheckinDate(today);

        User saved = userRepository.save(user);
        log.info("Check-in {} -> racha={} días, +{} pts (total={})",
            email, newStreak, bonus, saved.getPoints());
        return saved;
    }

    /**
     * Suma puntos por compra. 1 pto = $20 COP.
     * Límite acumulado: máximo DAILY_POINTS_LIMIT puntos por compras en un mismo día.
     * Si ya llegó al límite hoy, se acreditan 0 puntos (pero la compra sigue adelante).
     * Actualiza racha de compras.
     */
    @Transactional
    public User awardPurchasePoints(String email, int total) {
        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado: " + email));

        LocalDate today        = LocalDate.now();
        LocalDate yesterday    = today.minusDays(1);

        // Resetear contador diario si cambió el día
        int dailyEarnedSoFar = 0;
        if (today.equals(user.getLastPointsDate())) {
            dailyEarnedSoFar = user.getDailyPointsEarned() == null ? 0 : user.getDailyPointsEarned();
        }
        // Cuánto puede ganar aún hoy
        int remaining  = Math.max(0, DAILY_POINTS_LIMIT - dailyEarnedSoFar);
        int rawEarned  = Math.max(0, total / 20);    // 1 pt = $20 COP
        int earned     = Math.min(rawEarned, remaining);

        if (earned > 0) {
            int currentPts = user.getPoints() == null ? 0 : user.getPoints();
            user.setPoints(currentPts + earned);
            user.setDailyPointsEarned(dailyEarnedSoFar + earned);
            user.setLastPointsDate(today);
        }

        // Racha de compras
        int newStreak;
        LocalDate lastPurchase = user.getLastPurchaseDate();
        if (today.equals(lastPurchase)) {
            newStreak = user.getPurchaseStreak() == null ? 1 : user.getPurchaseStreak();
        } else if (yesterday.equals(lastPurchase)) {
            newStreak = (user.getPurchaseStreak() == null ? 0 : user.getPurchaseStreak()) + 1;
        } else {
            newStreak = 1;
        }
        user.setPurchaseStreak(newStreak);
        user.setLastPurchaseDate(today);

        User saved = userRepository.save(user);
        log.info("Puntos compra {} -> brutos={} acreditados={} (límite diario={}/{}, total={}, racha={})",
            email, rawEarned, earned, dailyEarnedSoFar + earned, DAILY_POINTS_LIMIT,
            saved.getPoints(), newStreak);
        return saved;
    }

    /**
     * Canjea puntos: descuenta los puntos del usuario si tiene saldo suficiente.
     * Mínimo REDEEM_MIN_POINTS para canjear. Devuelve el usuario actualizado.
     * Lanza IllegalArgumentException si no tiene suficientes puntos.
     */
    @Transactional
    public User redeemPoints(String email, int pointsToRedeem) {
        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado: " + email));

        int current = user.getPoints() == null ? 0 : user.getPoints();

        if (pointsToRedeem < REDEEM_MIN_POINTS) {
            throw new IllegalArgumentException(
                "El mínimo para canjear es " + REDEEM_MIN_POINTS + " puntos");
        }
        if (current < pointsToRedeem) {
            throw new IllegalArgumentException(
                "Puntos insuficientes. Tienes " + current + " y quieres canjear " + pointsToRedeem);
        }

        user.setPoints(current - pointsToRedeem);
        User saved = userRepository.save(user);
        log.info("Canje {} -> -{} pts (restante={})", email, pointsToRedeem, saved.getPoints());
        return saved;
    }

    /** Suma puntos manualmente (admin o eventos especiales). No cuenta para límite diario. */
    @Transactional
    public User addPoints(String email, int pts) {
        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado: " + email));
        int current = user.getPoints() == null ? 0 : user.getPoints();
        user.setPoints(current + pts);
        return userRepository.save(user);
    }

    /** Obtiene usuario por email (para sincronizar estado al hacer login). */
    public User getByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email.toLowerCase().trim())
            .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado: " + email));
    }

    /** Lista todos los usuarios ordenados por fecha de registro (más recientes primero). */
    public List<User> getAllUsers() {
        return userRepository.findAllByOrderByCreatedAtDesc();
    }

    // ── Recuperación de contraseña ────────────────────────────

    @Transactional
    public String generateResetToken(String email) {
        User user = userRepository.findByEmailIgnoreCase(email.toLowerCase().trim())
            .orElseThrow(() -> new EntityNotFoundException("No existe cuenta con ese correo"));
        String token = UUID.randomUUID().toString().replace("-", "");
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);
        log.info("🔑 Token de reset generado para {}", email);
        return token;
    }

    public boolean validateResetToken(String token) {
        Optional<User> opt = userRepository.findByResetToken(token);
        if (opt.isEmpty()) return false;
        User user = opt.get();
        return user.getResetTokenExpiry() != null
            && LocalDateTime.now().isBefore(user.getResetTokenExpiry());
    }

    @Transactional
    public void resetPassword(String token, String newPasswordHash) {
        User user = userRepository.findByResetToken(token)
            .orElseThrow(() -> new EntityNotFoundException("Token inválido o expirado"));
        if (user.getResetTokenExpiry() == null
                || LocalDateTime.now().isAfter(user.getResetTokenExpiry())) {
            throw new IllegalArgumentException("El enlace de recuperación ya expiró");
        }
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
        log.info("✅ Contraseña restablecida para usuario id={}", user.getId());
    }

    public String getEmailByResetToken(String token) {
        return userRepository.findByResetToken(token)
            .map(User::getEmail)
            .orElseThrow(() -> new EntityNotFoundException("Token inválido"));
    }
}
