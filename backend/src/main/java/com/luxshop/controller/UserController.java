package com.luxshop.controller;

import com.luxshop.model.User;
import com.luxshop.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * POST /api/users/register
     * El frontend llama esto al registrar una cuenta nueva.
     * Body: { name, email, phone, document, city, neighborhood, address }
     */
    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody Map<String, Object> payload) {
        User user = userService.registerOrUpdate(payload);
        return ResponseEntity.ok(user);
    }

    /**
     * GET /api/users
     * El panel admin llama esto para ver todos los clientes registrados.
     */
    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userService.getAllUsers());
    }
}
