package com.luxshop.service;

import com.luxshop.model.User;
import com.luxshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final EmailService   emailService;   // ✅ FIX: inyectado para enviar email de bienvenida

    /**
     * Registra un usuario nuevo o actualiza sus datos si el email ya existe.
     * Al ser registro NUEVO, envía email de bienvenida automáticamente.
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

        User saved = userRepository.save(user);
        log.info("✅ Usuario {}: {} ({})", isNew ? "registrado" : "actualizado", saved.getName(), saved.getEmail());

        // ✅ FIX: enviar email de bienvenida solo en registros nuevos
        if (isNew) {
            try {
                emailService.sendWelcomeEmail(saved.getEmail(), saved.getName());
            } catch (Exception e) {
                log.warn("No se pudo enviar email de bienvenida a {}: {}", saved.getEmail(), e.getMessage());
            }
        }

        return saved;
    }

    /** Lista todos los usuarios ordenados por fecha de registro (más recientes primero). */
    public List<User> getAllUsers() {
        return userRepository.findAllByOrderByCreatedAtDesc();
    }
}
