// ════════════════════════════════════════════════════════════════
// INSTRUCCIÓN: Copia estos dos métodos dentro de EmailService.java
// Pégalos justo ANTES de la llave de cierre final  }  del archivo.
// ════════════════════════════════════════════════════════════════

    // ── Cupón de bienvenida por EMAIL ─────────────────────────
    public void sendWelcomeCoupon(String toEmail, String code) {
        if (!isEmailConfigured()) {
            log.warn("SendGrid no configurado — email de cupón omitido");
            return;
        }
        String html = buildWelcomeCouponHtml(toEmail, code);
        sendEmail(toEmail, "Amiga Kosmica",
            "💜 Tu código de descuento exclusivo — " + code, html);
    }

    // ── Cupón de bienvenida por WHATSAPP ─────────────────────
    public void sendWelcomeCouponWhatsapp(String phone, String code) {
        if (!isWhatsappConfigured()) {
            log.warn("WhatsApp no configurado — mensaje de cupón omitido");
            return;
        }
        String msg = "💜 ¡Hola! Bienvenida a *Kosmica* 🛍️\n\n"
            + "Aquí está tu código de descuento exclusivo:\n\n"
            + "🏷️ *" + code + "*\n\n"
            + "Aplícalo al hacer tu compra y obtén un *10% de descuento* en tu primer pedido.\n\n"
            + "👉 Compra aquí: https://www.kosmica.com.co\n\n"
            + "¡Te esperamos! 💜";
        sendWhatsapp(phone, msg);
    }

    // ── HTML del correo de bienvenida ─────────────────────────
    private String buildWelcomeCouponHtml(String email, String code) {
        return "<!DOCTYPE html><html><head><meta charset='utf-8'></head>"
            + "<body style='margin:0;padding:0;background:#F8F4FF;font-family:Arial,sans-serif'>"
            + "<div style='max-width:540px;margin:0 auto;padding:24px 16px'>"
            + "<div style='background:linear-gradient(135deg,#9B72CF,#7B5EA7);border-radius:20px 20px 0 0;padding:32px 28px;text-align:center'>"
            + "<div style='font-size:2.5rem;margin-bottom:8px'>💜</div>"
            + "<h1 style='color:#fff;margin:0;font-size:1.5rem;font-family:Georgia,serif'>Bienvenida a Kosmica</h1>"
            + "<p style='color:rgba(255,255,255,.85);font-size:.9rem;margin-top:8px'>Tu código de descuento exclusivo te espera</p>"
            + "</div>"
            + "<div style='background:#fff;border:1.5px solid #F0E8FF;border-top:none;padding:32px 28px;border-radius:0 0 20px 20px;text-align:center'>"
            + "<p style='color:#6B5B8A;font-size:.95rem;margin-bottom:24px'>Hola 👋 Gracias por suscribirte. Como regalo de bienvenida, aquí tienes tu cupón:</p>"
            + "<div style='background:linear-gradient(135deg,#F0E8FF,#E8D5FF);border:2px dashed #9B72CF;border-radius:16px;padding:24px;margin:0 0 24px'>"
            + "<p style='margin:0 0 8px;color:#6B5B8A;font-size:.82rem;text-transform:uppercase;letter-spacing:1px'>Tu código de descuento</p>"
            + "<div style='font-size:2rem;font-weight:900;color:#7B5EA7;letter-spacing:4px'>" + code + "</div>"
            + "<p style='margin:10px 0 0;color:#9B72CF;font-size:.85rem;font-weight:700'>10% de descuento en tu primera compra</p>"
            + "</div>"
            + "<a href='https://www.kosmica.com.co' style='display:inline-block;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:700;font-size:1rem'>Ir a comprar ahora →</a>"
            + "<p style='color:#C9B8E8;font-size:.78rem;margin-top:24px'>Válido solo para tu primera compra. No acumulable con otras promociones.</p>"
            + "</div>"
            + "<p style='text-align:center;color:#C9B8E8;font-size:.7rem;margin-top:14px'>© 2025 " + storeName + "</p>"
            + "</div></body></html>";
    }
