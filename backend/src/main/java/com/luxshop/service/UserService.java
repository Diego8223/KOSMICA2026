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

    /**
     * Registra un usuario nuevo o actualiza sus datos si el email ya existe.
     * Se llama desde el frontend al crear cuenta.
     */
    public User registerOrUpdate(Map<String, Object> payload) {
        String email = ((String) payload.getOrDefault("email", "")).toLowerCase().trim();
        if (email.isEmpty()) throw new IllegalArgumentException("Email requerido");

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
        log.info("✅ Usuario guardado: {} ({})", saved.getName(), saved.getEmail());
        return saved;
    }

    /** Lista todos los usuarios ordenados por fecha de registro (más recientes primero). */
    public List<User> getAllUsers() {
        return userRepository.findAllByOrderByCreatedAtDesc();
    }
}
