package com.luxshop.service;

// ══════════════════════════════════════════════════════════════
//  KOSMICA — UserService.java  (PARCHE v2 — Sistema de Puntos)
//
//  CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
//
//  ❌ BUG CRÍTICO CORREGIDO:
//     ANTES:  rawEarned = total / 20   ← INCORRECTO
//     AHORA:  lógica delegada a PointsConstants.calculatePurchasePoints()
//             que usa floor(total / 1.000) ← CORRECTO
//
//  ✅ Los métodos awardPurchasePoints, doCheckin, redeemPoints
//     se delegan a PointsService para mantener lógica centralizada.
//
//  ✅ Se mantienen los métodos legacy addPoints y getByEmail
//     para no romper código existente.
//
//  ⚠️  Para nuevas integraciones: usar PointsService directamente.
// ══════════════════════════════════════════════════════════════

import com.luxshop.constants.PointsConstants;
import com.luxshop.dto.PointsDtos.*;
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

    private final UserRepository userRepo;
    private final EmailService   emailService;
    private final PointsService  pointsService;  // ← delegar lógica de puntos

    // ══════════════════════════════════════════════════════════
    //  REGISTRO / ACTUALIZACIÓN
    // ══════════════════════════════════════════════════════════

    @Transactional
    public User registerOrUpdate(Map<String, Object> payload) {
        String email = ((String) payload.getOrDefault("email", "")).toLowerCase().trim();
        if (email.isEmpty()) throw new IllegalArgumentException("Email requerido");

        Optional<User> existing = userRepo.findByEmailIgnoreCase(email);
        boolean isNew = existing.isEmpty();
        User user = existing.orElse(new User());

        user.setEmail(email);
        user.setName((String) payload.getOrDefault("name", ""));
        user.setPhone((String) payload.getOrDefault("phone", ""));
        user.setDocument((String) payload.getOrDefault("document", ""));
        user.setCity((String) payload.getOrDefault("city", ""));
        user.setNeighborhood((String) payload.getOrDefault("neighborhood", ""));
        user.setAddress((String) payload.getOrDefault("address", ""));

        User saved = userRepo.save(user);

        if (isNew) {
            // Otorgar puntos de bienvenida via PointsService (registra historial)
            AddBonusPointsRequest bonus = new AddBonusPointsRequest();
            bonus.setType("SIGNUP");
            pointsService.awardBonusPoints(email, bonus);

            try {
                emailService.sendWelcomeEmail(saved.getEmail(), saved.getName());
            } catch (Exception e) {
                log.warn("No se pudo enviar email de bienvenida a {}: {}", email, e.getMessage());
            }

            log.info("✅ Usuario registrado: {} ({}), +{} pts de bienvenida",
                saved.getName(), email, PointsConstants.BONUS_SIGNUP);
        } else {
            log.info("🔄 Usuario actualizado: {}", email);
        }

        return saved;
    }

    // ══════════════════════════════════════════════════════════
    //  MÉTODOS DE PUNTOS — DELEGADOS A PointsService
    //  Se mantienen por compatibilidad con código existente.
    // ══════════════════════════════════════════════════════════

    /**
     * @deprecated Usar PointsService.doCheckin() directamente.
     */
    @Transactional
    public User doCheckin(String email) {
        pointsService.doCheckin(email);
        return getByEmail(email);
    }

    /**
     * Suma puntos por compra.
     *
     * ✅ CORREGIDO: antes usaba total/20, ahora usa PointsConstants.calculatePurchasePoints()
     *    que aplica floor(total / 1.000)
     *
     * @deprecated Para nuevas integraciones, llamar directamente a
     *             PointsService.awardPurchasePoints()
     */
    @Transactional
    public User awardPurchasePoints(String email, int totalCop) {
        AddPurchasePointsRequest req = new AddPurchasePointsRequest();
        req.setTotalCop(totalCop);
        req.setOrderNumber("LEGACY");
        pointsService.awardPurchasePoints(email, req);
        return getByEmail(email);
    }

    /**
     * Canjea puntos.
     *
     * @deprecated Para nuevas integraciones, llamar directamente a
     *             PointsService.redeemPoints()
     */
    @Transactional
    public User redeemPoints(String email, int pointsToRedeem) {
        // Usamos el mínimo de orden requerido en la validación
        RedeemPointsRequest req = new RedeemPointsRequest();
        req.setPointsToRedeem(pointsToRedeem);
        req.setOrderTotalCop(PointsConstants.REDEEM_MIN_ORDER_COP); // mínimo válido
        req.setOrderNumber("LEGACY");
        pointsService.redeemPoints(email, req);
        return getByEmail(email);
    }

    /** Suma puntos manualmente sin límite diario (admin o eventos especiales). */
    @Transactional
    public User addPoints(String email, int pts) {
        AddBonusPointsRequest req = new AddBonusPointsRequest();
        req.setType("ADMIN");
        req.setAdminPoints(pts);
        pointsService.awardBonusPoints(email, req);
        return getByEmail(email);
    }

    // ══════════════════════════════════════════════════════════
    //  CONSULTAS
    // ══════════════════════════════════════════════════════════

    public User getByEmail(String email) {
        return userRepo.findByEmailIgnoreCase(email.toLowerCase().trim())
            .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado: " + email));
    }

    public List<User> getAllUsers() {
        return userRepo.findAllByOrderByCreatedAtDesc();
    }

    // ══════════════════════════════════════════════════════════
    //  RECUPERACIÓN DE CONTRASEÑA
    // ══════════════════════════════════════════════════════════

    @Transactional
    public String generateResetToken(String email) {
        User user = userRepo.findByEmailIgnoreCase(email.toLowerCase().trim())
            .orElseThrow(() -> new EntityNotFoundException("No existe cuenta con ese correo"));
        String token = UUID.randomUUID().toString().replace("-", "");
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepo.save(user);
        return token;
    }

    public boolean validateResetToken(String token) {
        Optional<User> opt = userRepo.findByResetToken(token);
        if (opt.isEmpty()) return false;
        User user = opt.get();
        return user.getResetTokenExpiry() != null
            && LocalDateTime.now().isBefore(user.getResetTokenExpiry());
    }

    @Transactional
    public void resetPassword(String token, String newPasswordHash) {
        User user = userRepo.findByResetToken(token)
            .orElseThrow(() -> new EntityNotFoundException("Token inválido o expirado"));
        if (user.getResetTokenExpiry() == null
                || LocalDateTime.now().isAfter(user.getResetTokenExpiry())) {
            throw new IllegalArgumentException("El enlace de recuperación ya expiró");
        }
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepo.save(user);
    }

    public String getEmailByResetToken(String token) {
        return userRepo.findByResetToken(token)
            .map(User::getEmail)
            .orElseThrow(() -> new EntityNotFoundException("Token inválido"));
    }
}
