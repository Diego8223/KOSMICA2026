package com.luxshop.service;

import com.luxshop.model.User;
import com.luxshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final EmailService   emailService;

    private static final int WELCOME_POINTS     = 20;
    private static final int DAILY_CHECKIN_PTS  = 5;
    private static final int DAILY_POINTS_LIMIT = 500;

    /**
     * Registra un usuario nuevo o actualiza sus datos si el email ya existe.
     * Al ser registro NUEVO: asigna 20 pts de bienvenida y envia email.
     */
    public User registerOrUpdate(Map<String, Object> payload) {
        String email = ((String) payload.getOrDefault("email", "")).toLowerCase().trim();
        if (email.isEmpty()) throw new IllegalArgumentException("Email requerido");

        boolean isNew = !userRepository.findByEmailIgnoreCase(email).isPresent();

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElse(new User());

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
        log.info("Usuario {}: {} ({})", isNew ? "registrado" : "actualizado", saved.getName(), saved.getEmail());

        if (isNew) {
            try {
                emailService.sendWelcomeEmail(saved.getEmail(), saved.getName());
            } catch (Exception e) {
                log.warn("No se pudo enviar email de bienvenida a {}: {}", saved.getEmail(), e.getMessage());
            }
        }

        return saved;
    }

    /**
     * Check-in diario: suma puntos y actualiza racha.
     * Racha >= 3 dias: +5 bonus; >= 7 dias: +10 bonus.
     * Si ya hizo check-in hoy: devuelve usuario sin cambios.
     */
    public User doCheckin(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + email));

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

        int bonus = DAILY_CHECKIN_PTS + (newStreak >= 7 ? 10 : newStreak >= 3 ? 5 : 0);
        int currentPts = user.getPoints() == null ? 0 : user.getPoints();
        user.setPoints(currentPts + bonus);
        user.setCheckinStreak(newStreak);
        user.setLastCheckinDate(today);

        User saved = userRepository.save(user);
        log.info("Check-in {} -> racha={} dias, +{} pts (total={})", email, newStreak, bonus, saved.getPoints());
        return saved;
    }

    /**
     * Suma puntos por compra. 1 pto = $36 COP. Actualiza racha de compras.
     */
    public User awardPurchasePoints(String email, int total) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + email));

        LocalDate today     = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        int earned = Math.max(0, Math.min(total / 36, DAILY_POINTS_LIMIT));
        int currentPts = user.getPoints() == null ? 0 : user.getPoints();
        user.setPoints(currentPts + earned);

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
        log.info("Puntos compra {} -> +{} pts (total={}, racha_compras={})", email, earned, saved.getPoints(), newStreak);
        return saved;
    }

    /**
     * Suma puntos manualmente (admin o eventos especiales).
     */
    public User addPoints(String email, int pts) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + email));
        int current = user.getPoints() == null ? 0 : user.getPoints();
        user.setPoints(current + pts);
        return userRepository.save(user);
    }

    /**
     * Obtiene usuario por email (para sincronizar estado al hacer login).
     */
    public User getByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email.toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + email));
    }

    /** Lista todos los usuarios ordenados por fecha de registro (mas recientes primero). */
    public List<User> getAllUsers() {
        return userRepository.findAllByOrderByCreatedAtDesc();
    }
}
