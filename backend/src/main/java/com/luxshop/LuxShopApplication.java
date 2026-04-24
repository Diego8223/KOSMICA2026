package com.luxshop;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.security.Security;

/**
 * ✅ PARCHE v2 — Cambio aplicado:
 *
 *  + @EnableScheduling  → activa los cron jobs (@Scheduled)
 *    Sin esta anotación, PointsExpirationJob nunca se ejecutaría
 *    y los puntos NUNCA expirarían.
 */
@EnableScheduling   // ← NUEVO
@SpringBootApplication
public class LuxShopApplication {

    static {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    public static void main(String[] args) {
        SpringApplication.run(LuxShopApplication.class, args);
    }
}
