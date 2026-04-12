package com.luxshop;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.security.Security;

@SpringBootApplication
public class LuxShopApplication {

    static {
        // Registrar BouncyCastle como proveedor de seguridad
        // Necesario para que web-push pueda firmar las notificaciones con VAPID (ECDH/ECDSA)
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    public static void main(String[] args) {
        SpringApplication.run(LuxShopApplication.class, args);
    }
}
