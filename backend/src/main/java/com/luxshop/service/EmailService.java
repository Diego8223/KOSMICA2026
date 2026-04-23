package com.luxshop.service;

import com.luxshop.model.GiftCard;
import com.luxshop.model.Order;
import com.luxshop.model.OrderItem;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;

@Slf4j
@Service
public class EmailService {

    @Value("${sendgrid.api.key:}")
    private String sendgridKey;

    @Value("${store.email:hola@kosmica.com}")
    private String storeEmail;

    @Value("${store.name:Kosmica}")
    private String storeName;

    @Value("${store.url:https://www.kosmica.com.co}")
    private String storeUrl;

    @Value("${admin.whatsapp:}")
    private String adminWhatsapp;

    @Value("${callmebot.api.key:}")
    private String callmebotKey;

    // ✅ FIX: Leer MAIL_USER y MAIL_PASSWORD correctamente desde application.properties
    @Value("${spring.mail.username:}")
    private String gmailUser;

    @Value("${spring.mail.password:}")
    private String gmailPassword;

    // ✅ NUEVO: Email admin secundario (opcional) para alertas de pedidos
    @Value("${admin.email:}")
    private String adminEmail;

    private boolean isEmailConfigured() {
        boolean hasSendGrid = sendgridKey != null && sendgridKey.startsWith("SG.");
        boolean hasGmail    = gmailUser != null && !gmailUser.isBlank()
                           && gmailPassword != null && !gmailPassword.isBlank();
        if (!hasSendGrid && !hasGmail) {
            log.warn("⚠️ EMAIL NO CONFIGURADO. Revisa las variables de entorno: " +
                     "MAIL_USER + MAIL_PASSWORD (Gmail) o SENDGRID_API_KEY");
        }
        return hasSendGrid || hasGmail;
    }

    private boolean isWhatsappConfigured() {
        return adminWhatsapp != null && !adminWhatsapp.isBlank()
            && callmebotKey != null && !callmebotKey.isBlank();
    }

    // ── Confirmación nuevo pedido ─────────────────────────────
    public void sendOrderConfirmation(Order order) {
        if (isEmailConfigured()) {
            // ✅ FIX: Email al cliente con número de pedido destacado
            sendEmail(order.getCustomerEmail(), order.getCustomerName(),
                "✅ Pedido confirmado — " + order.getOrderNumber(),
                buildConfirmationHtml(order));
            log.info("✉️ Confirmación enviada al cliente: {}", order.getCustomerEmail());

            // ✅ FIX: Email al admin con todos los detalles del pedido
            sendAdminAlert(order);
            log.info("✉️ Alerta de pedido enviada al admin: {}", storeEmail);

            // ✅ NUEVO: Si hay adminEmail configurado, también enviar ahí
            if (adminEmail != null && !adminEmail.isBlank() && !adminEmail.equalsIgnoreCase(storeEmail)) {
                sendAdminAlert(order, adminEmail);
                log.info("✉️ Copia de alerta enviada a: {}", adminEmail);
            }
        } else {
            log.warn("Email no configurado — confirmación de pedido {} omitida", order.getOrderNumber());
        }

        if (isWhatsappConfigured()) {
            String msg = buildAdminWhatsappMsg(order);
            sendWhatsapp(adminWhatsapp, msg);
        }

        if (isWhatsappConfigured() && order.getPhone() != null && !order.getPhone().isBlank()) {
            String clientPhone = order.getPhone().replaceAll("[^0-9]", "");
            if (!clientPhone.startsWith("57")) clientPhone = "57" + clientPhone;
            String msg = buildClientWhatsappMsg(order);
            sendWhatsapp(clientPhone, msg);
        }
    }

    // ── Actualización de estado ───────────────────────────────
    public void sendStatusUpdate(Order order) {
        if (isEmailConfigured()) {
            if (order.getStatus() == null) return;
            String subject, title, msg, color, bg;
            switch (order.getStatus()) {
                case PROCESSING -> {
                    subject = "📦 Preparando tu pedido — " + order.getOrderNumber();
                    title = "📦 ¡Estamos preparando tu pedido!";
                    msg   = "Nuestro equipo está empacando todo con mucho cuidado. ¡Pronto sale!";
                    color = "#1565C0"; bg = "#E3F2FD";
                }
                case SHIPPED -> {
                    subject = "🚚 Tu pedido está en camino — " + order.getOrderNumber();
                    title = "🚚 ¡Tu pedido está en camino!";
                    msg   = "Tu pedido fue enviado y llegará pronto a tu dirección. 🎁";
                    color = "#7B1FA2"; bg = "#F3E5F5";
                }
                case DELIVERED -> {
                    subject = "🎉 ¡Pedido entregado! — " + order.getOrderNumber();
                    title = "🎉 ¡Tu pedido llegó!";
                    msg   = "Tu pedido fue entregado. Esperamos que ames todo lo que pediste 💕";
                    color = "#1B5E20"; bg = "#E8F5E9";
                }
                case CANCELLED -> {
                    subject = "❌ Pedido cancelado — " + order.getOrderNumber();
                    title = "❌ Tu pedido fue cancelado";
                    msg   = "Tu pedido fue cancelado. Escríbenos si tienes dudas.";
                    color = "#C62828"; bg = "#FFEBEE";
                }
                default -> { return; }
            }
            sendEmail(order.getCustomerEmail(), order.getCustomerName(),
                subject, buildStatusHtml(order, title, msg, color, bg));
        }

        if (isWhatsappConfigured() && order.getPhone() != null && !order.getPhone().isBlank()) {
            String clientPhone = order.getPhone().replaceAll("[^0-9]", "");
            if (!clientPhone.startsWith("57")) clientPhone = "57" + clientPhone;
            String waMsg = buildStatusWhatsappMsg(order);
            if (waMsg != null) sendWhatsapp(clientPhone, waMsg);
        }
    }

    // ── Cupón de bienvenida por EMAIL ─────────────────────────
    public void sendWelcomeCoupon(String toEmail, String code) {
        if (!isEmailConfigured()) {
            log.warn("Email no configurado — cupón omitido para {}", toEmail);
            return;
        }
        String html = buildWelcomeCouponHtml(toEmail, code);
        sendEmail(toEmail, "Amiga Kosmica",
            "💜 Tu código de descuento exclusivo — " + code, html);
    }

    // ── Recuperar contraseña ──────────────────────────────────
    public void sendPasswordReset(String toEmail, String toName, String resetToken) {
        // ✅ FIX: Log detallado para diagnosticar el problema
        log.info("🔐 Intentando enviar email de reset a: {} | emailConfigured={}", toEmail, isEmailConfigured());
        log.info("   gmailUser='{}' | gmailPassword='{}' | sendgridKey='{}'",
            gmailUser != null && !gmailUser.isBlank() ? gmailUser : "VACÍO",
            gmailPassword != null && !gmailPassword.isBlank() ? "***configurada***" : "VACÍA",
            sendgridKey != null && sendgridKey.startsWith("SG.") ? "SG.***" : "VACÍO");

        if (!isEmailConfigured()) {
            log.error("❌ EMAIL NO CONFIGURADO — no se puede enviar recuperación de contraseña a {}. " +
                      "Configura MAIL_USER + MAIL_PASSWORD en las variables de entorno de Render.", toEmail);
            return;
        }

        String resetLink = storeUrl + "/reset-password?token=" + resetToken;
        String firstName = (toName != null && !toName.isBlank())
            ? toName.split(" ")[0] : "amiga";

        String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'/></head>"
            + "<body style='margin:0;padding:0;background:#F5F0FF;font-family:Arial,sans-serif'>"
            + "<div style='max-width:520px;margin:0 auto;background:#fff;border-radius:20px;"
            + "overflow:hidden;box-shadow:0 4px 24px rgba(45,27,78,.1)'>"
            + "<div style='background:linear-gradient(135deg,#9B72CF,#7C3AED);padding:36px 32px;text-align:center'>"
            + "<div style='font-size:2.5rem;margin-bottom:8px'>🔐</div>"
            + "<h1 style='color:#fff;font-size:1.6rem;font-weight:800;margin:0'>Restablecer contraseña</h1>"
            + "<p style='color:rgba(255,255,255,.85);margin:8px 0 0;font-size:.95rem'>Recibimos tu solicitud</p>"
            + "</div>"
            + "<div style='padding:32px'>"
            + "<p style='color:#2D1B4E;font-size:1rem;margin-bottom:16px'>Hola <strong>" + firstName + "</strong> 💜</p>"
            + "<p style='color:#6B7280;font-size:.95rem;line-height:1.6;margin-bottom:24px'>"
            + "Recibimos una solicitud para restablecer la contraseña de tu cuenta <strong>" + toEmail + "</strong>.<br/>"
            + "Haz clic en el botón de abajo para crear una nueva contraseña. "
            + "Este enlace es válido por <strong>1 hora</strong>.</p>"
            + "<a href='" + resetLink + "' style='display:block;background:linear-gradient(135deg,#9B72CF,#7C3AED);"
            + "color:#fff;text-align:center;padding:16px;border-radius:14px;text-decoration:none;"
            + "font-weight:800;font-size:1rem;margin-bottom:24px'>Restablecer mi contraseña →</a>"
            + "<p style='color:#9CA3AF;font-size:.8rem;line-height:1.6;text-align:center'>"
            + "Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará.<br/>"
            + "¿Problemas? Escríbenos a <strong>" + storeEmail + "</strong></p>"
            + "</div>"
            + "<div style='background:#F9F7FF;padding:14px;text-align:center'>"
            + "<p style='color:#9CA3AF;font-size:.75rem;margin:0'>" + storeName + " · "
            + "<a href='" + storeUrl + "' style='color:#9B72CF'>" + storeUrl + "</a></p>"
            + "</div></div></body></html>";

        sendEmail(toEmail, firstName, "🔐 Restablecer contraseña — " + storeName, html);
        log.info("✉️ Email de reset enviado a {}", toEmail);
    }

    // ── Email de bienvenida al registrarse ───────────────────
    public void sendWelcomeEmail(String toEmail, String toName) {
        if (!isEmailConfigured()) {
            log.warn("Email no configurado — bienvenida omitida para {}", toEmail);
            return;
        }
        String html = buildWelcomeRegisterHtml(toName);
        sendEmail(toEmail, toName,
            "💜 ¡Bienvenida a " + storeName + ", " + toName.split(" ")[0] + "!", html);
        log.info("✉️ Email de bienvenida enviado a {}", toEmail);
    }

    // ── Cupón de bienvenida por WHATSAPP ─────────────────────
    public void sendWelcomeCouponWhatsapp(String phone, String code) {
        if (!isWhatsappConfigured()) {
            log.warn("WhatsApp no configurado — cupón omitido");
            return;
        }
        String msg = "💜 ¡Hola! Bienvenida a *" + storeName + "* 🛍️\n\n"
            + "Aquí está tu código de descuento exclusivo:\n\n"
            + "🏷️ *" + code + "*\n\n"
            + "Aplícalo al hacer tu compra y obtén un *10% de descuento* en tu primer pedido.\n\n"
            + "👉 Compra aquí: " + storeUrl + "\n\n"
            + "¡Te esperamos! 💜";
        sendWhatsapp(phone, msg);
    }

    // ── Recompensa de referido ────────────────────────────────
    public void sendReferralReward(String ownerEmail, String ownerName,
                                   String ownerPhone, String redeemerName,
                                   String rewardCoupon) {
        if (isEmailConfigured()) {
            String subject = "🎉 ¡" + (redeemerName != null ? redeemerName : "Tu amiga")
                + " compró con tu código! Aquí está tu 15% — " + storeName;
            String html = buildReferralRewardHtml(ownerName, redeemerName, rewardCoupon);
            sendEmail(ownerEmail, ownerName, subject, html);
        } else {
            log.warn("Email no configurado — recompensa omitida para {}", ownerEmail);
        }

        if (isWhatsappConfigured() && ownerPhone != null && !ownerPhone.isBlank()) {
            String phone = ownerPhone.replaceAll("[^0-9]", "");
            if (!phone.startsWith("57")) phone = "57" + phone;
            String msg = "🎉 ¡Hola *" + ownerName + "*! Tienes una recompensa en *" + storeName + "* 💜\n\n"
                + "Tu amiga *" + (redeemerName != null ? redeemerName : "alguien") + "* acaba de hacer\n"
                + "su primera compra con tu código de referido.\n\n"
                + "🎁 *¡Ganaste un 15% de descuento para tu próxima compra!*\n\n"
                + "Tu cupón exclusivo:\n"
                + "🏷️ *" + rewardCoupon + "*\n\n"
                + "📌 Úsalo en: " + storeUrl + "\n\n"
                + "💜 ¡Gracias por recomendar " + storeName + "!";
            sendWhatsapp(phone, msg);
        }
    }

    // ── Tarjeta de Regalo ─────────────────────────────────────
    public void sendGiftCardNotifications(GiftCard gc) {
        if (isEmailConfigured()) {
            String subject = gc.getSenderName() + " te envió una Tarjeta de Regalo " + storeName + " 🎁";
            String html = buildGiftCardEmailHtml(gc);
            sendEmail(gc.getRecipientEmail(), gc.getRecipientName(), subject, html);
            log.info("✉️ Tarjeta regalo {} enviada a {}", gc.getCode(), gc.getRecipientEmail());
        } else {
            log.warn("Email no configurado — tarjeta regalo omitida");
        }

        if (isWhatsappConfigured() && gc.getSenderPhone() != null && !gc.getSenderPhone().isBlank()) {
            String senderPhone = gc.getSenderPhone().replaceAll("[^0-9]", "");
            if (!senderPhone.startsWith("57")) senderPhone = "57" + senderPhone;
            String msgSender = "✅ *¡Tu tarjeta de regalo fue enviada!* 🎁\n\n"
                + "Hola *" + gc.getSenderName() + "*, la tarjeta para *" + gc.getRecipientName() + "* ya fue procesada.\n\n"
                + "🎀 *Ocasión:* " + (gc.getOccasionLabel() != null ? gc.getOccasionLabel() : gc.getOccasion()) + "\n"
                + "💰 *Saldo:* $" + gc.getOriginalAmount() + " COP\n"
                + "🏷️ *Código:* *" + gc.getCode() + "*\n\n"
                + "El código ya fue enviado al correo de *" + gc.getRecipientName() + "* 💜";
            sendWhatsapp(senderPhone, msgSender);
        }
    }

    // ════════════════════════════════════════════════════════════
    //  MÉTODOS PRIVADOS — Envío de emails
    // ════════════════════════════════════════════════════════════

    // ✅ FIX PRINCIPAL: sendEmail prioriza Gmail, fallback a SendGrid
    private void sendEmail(String toEmail, String toName, String subject, String html) {
        if (gmailUser != null && !gmailUser.isBlank()
                && gmailPassword != null && !gmailPassword.isBlank()) {
            sendViaGmail(toEmail, toName, subject, html);
            return;
        }
        if (sendgridKey != null && sendgridKey.startsWith("SG.")) {
            sendViaSendGrid(toEmail, toName, subject, html);
            return;
        }
        log.error("⚠️ No hay proveedor de email configurado. " +
                  "Variables requeridas en Render: MAIL_USER + MAIL_PASSWORD (Gmail) " +
                  "o SENDGRID_API_KEY (SendGrid)");
    }

    private void sendViaGmail(String toEmail, String toName, String subject, String html) {
        try {
            JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
            mailSender.setHost("smtp.gmail.com");
            mailSender.setPort(587);
            mailSender.setUsername(gmailUser);
            mailSender.setPassword(gmailPassword);
            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            // ✅ FIX: timeout para no bloquear el hilo en producción
            props.put("mail.smtp.connectiontimeout", "10000");
            props.put("mail.smtp.timeout", "10000");
            props.put("mail.smtp.writetimeout", "10000");

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(gmailUser, storeName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("✉️ Email enviado via Gmail a {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Error enviando email via Gmail a {}: {}", toEmail, e.getMessage());
            // ✅ FIX: fallback a SendGrid si Gmail falla
            if (sendgridKey != null && sendgridKey.startsWith("SG.")) {
                log.info("🔄 Intentando enviar via SendGrid como fallback...");
                sendViaSendGrid(toEmail, toName, subject, html);
            }
        }
    }

    private void sendViaSendGrid(String toEmail, String toName, String subject, String html) {
        try {
            String safeHtml = html.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", "\\n");
            String body = "{\"personalizations\":[{\"to\":[{\"email\":\""
                + toEmail + "\",\"name\":\"" + toName.replace("\"","") + "\"}]}],"
                + "\"from\":{\"email\":\"" + storeEmail + "\",\"name\":\"" + storeName + "\"},"
                + "\"subject\":\"" + subject.replace("\"","'") + "\","
                + "\"content\":[{\"type\":\"text/html\",\"value\":\""
                + safeHtml + "\"}]}";

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.sendgrid.com/v3/mail/send"))
                .header("Authorization", "Bearer " + sendgridKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> resp = HttpClient.newHttpClient()
                .send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 202)
                log.info("✉️ Email enviado via SendGrid a {}", toEmail);
            else
                log.error("❌ SendGrid error {}: {}", resp.statusCode(), resp.body());

        } catch (Exception e) {
            log.error("❌ Error enviando email via SendGrid a {}: {}", toEmail, e.getMessage());
        }
    }

    // ── WhatsApp via CallMeBot ────────────────────────────────
    private void sendWhatsapp(String phone, String message) {
        try {
            String encoded = URLEncoder.encode(message, StandardCharsets.UTF_8);
            String url = "https://api.callmebot.com/whatsapp.php?phone=" + phone
                + "&text=" + encoded + "&apikey=" + callmebotKey;

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url)).GET().build();

            HttpResponse<String> resp = HttpClient.newHttpClient()
                .send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200)
                log.info("✅ WhatsApp enviado a {}", phone);
            else
                log.warn("WhatsApp error {}: {}", resp.statusCode(), resp.body());

        } catch (Exception e) {
            log.error("Error enviando WhatsApp a {}: {}", phone, e.getMessage());
        }
    }

    // ── Alerta admin — sobrecarga para destinatario específico ─
    private void sendAdminAlert(Order order) {
        sendAdminAlert(order, storeEmail);
    }

    private void sendAdminAlert(Order order, String recipientEmail) {
        StringBuilder rows = new StringBuilder();
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                String name  = item.getProduct() != null ? item.getProduct().getName() : "Producto";
                String price = item.getSubtotal() != null ? item.getSubtotal().toString() : "0";
                rows.append("<tr>")
                    .append("<td style='padding:8px 12px;border-bottom:1px solid #f0e8ff'>").append(name).append("</td>")
                    .append("<td style='padding:8px 12px;border-bottom:1px solid #f0e8ff;text-align:center'>").append(item.getQuantity()).append("</td>")
                    .append("<td style='padding:8px 12px;border-bottom:1px solid #f0e8ff;text-align:right;font-weight:700;color:#7B5EA7'>$").append(price).append("</td>")
                    .append("</tr>");
            }
        }
        String total = order.getTotal() != null ? order.getTotal().toString() : "0";
        String html = "<div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto'>"
            + "<div style='background:linear-gradient(135deg,#2D1B4E,#4A2D7A);padding:24px;border-radius:16px 16px 0 0;text-align:center'>"
            + "<h2 style='color:#fff;margin:0'>🛍️ Nuevo pedido en " + storeName + "</h2></div>"
            + "<div style='background:#fff;padding:24px;border:1px solid #F0E8FF;border-top:none;border-radius:0 0 16px 16px'>"
            + "<p><b>Pedido:</b> <span style='font-size:1.1rem;color:#7B5EA7'>" + order.getOrderNumber() + "</span></p>"
            + "<p><b>Cliente:</b> " + order.getCustomerName() + " — " + order.getCustomerEmail() + "</p>"
            + (order.getPhone() != null ? "<p><b>Teléfono:</b> " + order.getPhone() + "</p>" : "")
            + (order.getCity() != null ? "<p><b>Ciudad:</b> " + order.getCity() + "</p>" : "")
            + "<p><b>Dirección:</b> " + (order.getShippingAddress() != null ? order.getShippingAddress() : "No especificada") + "</p>"
            + "<table width='100%' style='border-collapse:collapse;margin:14px 0'>"
            + "<tr style='background:#F0E8FF'><th style='padding:8px 12px;text-align:left'>Producto</th>"
            + "<th style='padding:8px 12px'>Cant.</th><th style='padding:8px 12px'>Total</th></tr>"
            + rows
            + "</table>"
            + "<div style='background:#F0E8FF;border-radius:12px;padding:12px 16px;text-align:right'>"
            + "<b style='color:#7B5EA7;font-size:1.05rem'>Total: $" + total + "</b></div>"
            + "<div style='margin-top:16px;padding:12px;background:#FFF3CD;border-radius:8px;font-size:.85rem'>"
            + "🔗 Estado actual: <b>" + order.getStatus() + "</b> | Pago: <b>" + order.getPaymentMethod() + "</b>"
            + "</div>"
            + "</div></div>";

        sendEmail(recipientEmail, storeName,
            "🛍️ Nuevo pedido: " + order.getOrderNumber() + " — $" + total, html);
    }

    // ════════════════════════════════════════════════════════════
    //  HTML BUILDERS
    // ════════════════════════════════════════════════════════════

    // ✅ FIX: buildConfirmationHtml con número de pedido más destacado y tracking info
    private String buildConfirmationHtml(Order order) {
        StringBuilder rows = new StringBuilder();
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                String name     = item.getProduct() != null ? item.getProduct().getName() : "Producto";
                String subtotal = item.getSubtotal() != null ? item.getSubtotal().toString() : "0";
                rows.append("<tr>")
                    .append("<td style='padding:10px 14px;border-bottom:1px solid #f0e8ff'>").append(name).append("</td>")
                    .append("<td style='padding:10px 14px;border-bottom:1px solid #f0e8ff;text-align:center'>").append(item.getQuantity()).append("</td>")
                    .append("<td style='padding:10px 14px;border-bottom:1px solid #f0e8ff;text-align:right;font-weight:700;color:#7B5EA7'>$").append(subtotal).append("</td>")
                    .append("</tr>");
            }
        }
        String total = order.getTotal() != null ? order.getTotal().toString() : "0";
        return "<!DOCTYPE html><html><head><meta charset='utf-8'></head>"
            + "<body style='margin:0;padding:0;background:#F8F4FF;font-family:Arial,sans-serif'>"
            + "<div style='max-width:580px;margin:0 auto;padding:24px 16px'>"
            + "<div style='background:linear-gradient(135deg,#9B72CF,#7B5EA7);border-radius:20px 20px 0 0;padding:32px 28px;text-align:center'>"
            + "<div style='font-size:2.5rem'>✅</div>"
            + "<h1 style='color:#fff;margin:12px 0 0;font-size:1.6rem'>¡Pedido confirmado!</h1>"
            + "<p style='color:rgba(255,255,255,.8);margin:8px 0 0'>Gracias por tu compra, " + order.getCustomerName() + " 💕</p>"
            + "</div>"
            + "<div style='background:#fff;border:1.5px solid #F0E8FF;border-top:none;padding:28px;border-radius:0 0 20px 20px'>"
            // ✅ NÚMERO DE PEDIDO MUY DESTACADO para rastreo
            + "<div style='background:linear-gradient(135deg,#7B5EA7,#9B72CF);border-radius:14px;padding:20px 18px;margin-bottom:22px;text-align:center'>"
            + "<div style='font-size:.7rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.8);margin-bottom:6px'>Tu número de pedido</div>"
            + "<div style='font-size:1.6rem;font-weight:900;color:#fff;letter-spacing:2px'>" + order.getOrderNumber() + "</div>"
            + "<div style='font-size:.75rem;color:rgba(255,255,255,.75);margin-top:6px'>Guarda este número para rastrear tu pedido</div>"
            + "</div>"
            + "<table width='100%' style='border-collapse:collapse;margin-bottom:16px'>"
            + "<tr style='background:#F0E8FF'>"
            + "<th style='padding:10px 14px;text-align:left;font-size:.72rem;color:#7B5EA7'>Producto</th>"
            + "<th style='padding:10px 14px;font-size:.72rem;color:#7B5EA7'>Cant.</th>"
            + "<th style='padding:10px 14px;text-align:right;font-size:.72rem;color:#7B5EA7'>Subtotal</th></tr>"
            + rows
            + "</table>"
            + "<div style='background:#F0E8FF;border-radius:12px;padding:13px 16px;text-align:right;margin-bottom:20px'>"
            + "<span style='font-size:1.05rem;font-weight:700;color:#7B5EA7'>Total: $" + total + "</span></div>"
            + "<div style='background:#FAF7FF;border-radius:12px;padding:13px 16px;margin-bottom:20px'>"
            + "<b style='color:#2D1B4E;font-size:.83rem'>📍 Dirección de envío:</b><br>"
            + "<span style='color:#6B5B8A;font-size:.82rem'>" + (order.getShippingAddress() != null ? order.getShippingAddress() : "No especificada") + "</span>"
            + (order.getCity() != null ? "<br><span style='color:#6B5B8A;font-size:.82rem'>" + order.getCity() + "</span>" : "")
            + "</div>"
            // ✅ NUEVO: sección de rastreo
            + "<div style='background:#F0FFF4;border:1px solid #BBF7D0;border-radius:12px;padding:13px 16px;margin-bottom:20px'>"
            + "<b style='color:#166534;font-size:.83rem'>📦 Rastreo de pedido</b><br>"
            + "<span style='color:#15803D;font-size:.82rem'>Te notificaremos por este correo cuando tu pedido sea enviado. "
            + "También puedes escribirnos con tu número de pedido: <b>" + order.getOrderNumber() + "</b></span>"
            + "</div>"
            + "<div style='background:linear-gradient(135deg,#E8D5FF,#F5EEFF);border-radius:12px;padding:13px 16px;text-align:center'>"
            + "<p style='margin:0;color:#7B5EA7;font-size:.82rem'>¿Dudas? Escríbenos a <b>" + storeEmail + "</b></p></div>"
            + "</div>"
            + "<p style='text-align:center;color:#C9B8E8;font-size:.7rem;margin-top:14px'>© 2025 " + storeName + "</p>"
            + "</div></body></html>";
    }

    private String buildStatusHtml(Order order, String title, String msg, String color, String bg) {
        String total = order.getTotal() != null ? order.getTotal().toString() : "0";
        return "<!DOCTYPE html><html><head><meta charset='utf-8'></head>"
            + "<body style='margin:0;padding:0;background:#F8F4FF;font-family:Arial,sans-serif'>"
            + "<div style='max-width:560px;margin:0 auto;padding:24px 16px'>"
            + "<div style='background:linear-gradient(135deg,#9B72CF,#7B5EA7);border-radius:20px 20px 0 0;padding:28px;text-align:center'>"
            + "<h1 style='color:#fff;margin:0;font-size:1.4rem'>" + title + "</h1></div>"
            + "<div style='background:#fff;border:1.5px solid #F0E8FF;border-top:none;padding:26px;border-radius:0 0 20px 20px'>"
            + "<p style='color:#6B5B8A;font-size:.87rem;line-height:1.7'>Hola <b>" + order.getCustomerName() + "</b>, " + msg + "</p>"
            + "<div style='background:" + bg + ";border-radius:12px;padding:16px 18px;margin:16px 0;border-left:4px solid " + color + "'>"
            + "<div style='font-size:1.2rem;font-weight:700;color:#2D1B4E'>" + order.getOrderNumber() + "</div>"
            + "<div style='font-size:.77rem;color:#6B5B8A;margin-top:4px'>Total: $" + total + "</div></div>"
            + "<div style='background:#F0E8FF;border-radius:12px;padding:13px 16px;text-align:center'>"
            + "<p style='margin:0;color:#7B5EA7;font-size:.81rem'>¿Preguntas? <b>" + storeEmail + "</b></p></div>"
            + "</div>"
            + "<p style='text-align:center;color:#C9B8E8;font-size:.7rem;margin-top:14px'>© 2025 " + storeName + "</p>"
            + "</div></body></html>";
    }

    private String buildWelcomeCouponHtml(String email, String code) {
        return "<!DOCTYPE html><html><head><meta charset='utf-8'></head>"
            + "<body style='margin:0;padding:0;background:#F8F4FF;font-family:Arial,sans-serif'>"
            + "<div style='max-width:540px;margin:0 auto;padding:24px 16px'>"
            + "<div style='background:linear-gradient(135deg,#9B72CF,#7B5EA7);border-radius:20px 20px 0 0;padding:32px 28px;text-align:center'>"
            + "<div style='font-size:2.5rem;margin-bottom:8px'>💜</div>"
            + "<h1 style='color:#fff;margin:0;font-size:1.5rem'>Bienvenida a " + storeName + "</h1>"
            + "<p style='color:rgba(255,255,255,.85);font-size:.9rem;margin-top:8px'>Tu código de descuento exclusivo te espera</p>"
            + "</div>"
            + "<div style='background:#fff;border:1.5px solid #F0E8FF;border-top:none;padding:32px 28px;border-radius:0 0 20px 20px;text-align:center'>"
            + "<p style='color:#6B5B8A;font-size:.95rem;margin-bottom:24px'>Hola 👋 Gracias por suscribirte. Como regalo de bienvenida:</p>"
            + "<div style='background:linear-gradient(135deg,#F0E8FF,#E8D5FF);border:2px dashed #9B72CF;border-radius:16px;padding:24px;margin:0 0 24px'>"
            + "<p style='margin:0 0 8px;color:#6B5B8A;font-size:.82rem;text-transform:uppercase;letter-spacing:1px'>Tu código de descuento</p>"
            + "<div style='font-size:2rem;font-weight:900;color:#7B5EA7;letter-spacing:4px'>" + code + "</div>"
            + "<p style='margin:10px 0 0;color:#9B72CF;font-size:.85rem;font-weight:700'>10% de descuento en tu primera compra</p>"
            + "</div>"
            + "<a href='" + storeUrl + "' style='display:inline-block;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:700;font-size:1rem'>Ir a comprar ahora →</a>"
            + "<p style='color:#C9B8E8;font-size:.78rem;margin-top:24px'>Válido solo para primera compra. No acumulable.</p>"
            + "</div>"
            + "<p style='text-align:center;color:#C9B8E8;font-size:.7rem;margin-top:14px'>© 2025 " + storeName + "</p>"
            + "</div></body></html>";
    }

    private String buildWelcomeRegisterHtml(String name) {
        String firstName = name != null && !name.isBlank() ? name.split(" ")[0] : "amiga";
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>"
            + "<body style='margin:0;padding:0;background:#F5F0FF;font-family:Arial,sans-serif'>"
            + "<div style='max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(45,27,78,.1)'>"
            + "<div style='background:linear-gradient(135deg,#9B72CF,#7C3AED);padding:40px 32px;text-align:center'>"
            + "<div style='font-size:2.5rem;margin-bottom:8px'>✦</div>"
            + "<h1 style='color:#fff;font-size:1.8rem;margin:0;font-weight:800'>¡Bienvenida a " + storeName + "!</h1>"
            + "<p style='color:rgba(255,255,255,.85);margin:8px 0 0;font-size:1rem'>Tu cuenta ha sido creada exitosamente</p>"
            + "</div>"
            + "<div style='padding:32px'>"
            + "<p style='color:#2D1B4E;font-size:1.1rem;font-weight:700;margin-bottom:16px'>Hola " + firstName + " 💜</p>"
            + "<p style='color:#6B7280;font-size:.95rem;line-height:1.6;margin-bottom:24px'>Estamos felices de tenerte. Beneficios de tu cuenta:</p>"
            + "<div style='background:#F5F0FF;border-radius:12px;padding:20px;margin-bottom:24px'>"
            + "<div style='margin-bottom:12px;font-size:.9rem;color:#4C1D95'>⚡ Checkout en 1 clic</div>"
            + "<div style='margin-bottom:12px;font-size:.9rem;color:#4C1D95'>💎 20 puntos " + storeName + " de bienvenida</div>"
            + "<div style='margin-bottom:12px;font-size:.9rem;color:#4C1D95'>🎁 Acceso a tarjetas de regalo y referidos</div>"
            + "<div style='font-size:.9rem;color:#4C1D95'>📦 Historial y rastreo de pedidos</div>"
            + "</div>"
            + "<a href='" + storeUrl + "' style='display:block;background:linear-gradient(135deg,#9B72CF,#7C3AED);color:#fff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:800;font-size:1rem;margin-bottom:24px'>✦ Ir a la tienda</a>"
            + "<p style='color:#9CA3AF;font-size:.8rem;text-align:center;margin:0'>Si no creaste esta cuenta, ignora este correo.</p>"
            + "</div>"
            + "<div style='background:#F9F7FF;padding:16px;text-align:center'>"
            + "<p style='color:#9CA3AF;font-size:.75rem;margin:0'>" + storeName + " · <a href='" + storeUrl + "' style='color:#9B72CF'>" + storeUrl + "</a></p>"
            + "</div></div></body></html>";
    }

    private String buildReferralRewardHtml(String ownerName, String redeemerName, String rewardCoupon) {
        String friend = redeemerName != null ? redeemerName : "tu amiga";
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'/>"
            + "<style>body{font-family:Arial,sans-serif;background:#f5f0ff;margin:0;padding:20px}"
            + ".card{background:#fff;border-radius:16px;max-width:520px;margin:0 auto;padding:32px;box-shadow:0 4px 20px #7c3aed22}"
            + ".coupon-box{background:linear-gradient(135deg,#7C3AED,#A855F7);border-radius:12px;padding:24px;text-align:center;margin:24px 0}"
            + ".coupon-code{color:#fff;font-size:2rem;font-weight:900;letter-spacing:4px}"
            + ".btn{display:block;background:#7C3AED;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:50px;font-weight:700;font-size:1rem;margin:20px 0 0}"
            + "</style></head><body>"
            + "<div class='card'>"
            + "<div style='text-align:center;font-size:2.5rem;margin:16px 0'>🎉</div>"
            + "<h1 style='text-align:center;color:#1a1a1a;font-size:1.3rem;margin:0 0 16px'>¡" + friend + " compró con tu código!</h1>"
            + "<p style='color:#444;font-size:.97rem;line-height:1.6'>Hola <strong>" + ownerName + "</strong>,</p>"
            + "<p style='color:#444;font-size:.97rem;line-height:1.6'><strong>" + friend + "</strong> usó tu código de referido. ¡Tu recompensa del 15%:</p>"
            + "<div class='coupon-box'>"
            + "<div style='color:#e9d5ff;font-size:.8rem;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px'>Tu cupón exclusivo</div>"
            + "<div class='coupon-code'>" + rewardCoupon + "</div>"
            + "<div style='color:#e9d5ff;font-size:.9rem;margin-top:8px'>15% de descuento en tu próxima compra</div>"
            + "</div>"
            + "<a href='" + storeUrl + "' class='btn'>¡Ir a comprar ahora! →</a>"
            + "<p style='text-align:center;font-size:.78rem;color:#aaa;margin-top:20px'>Cupón de un solo uso. No acumulable.<br/>¿Preguntas? " + storeEmail + " 💜</p>"
            + "</div></body></html>";
    }

    private String buildAdminWhatsappMsg(Order order) {
        StringBuilder sb = new StringBuilder();
        sb.append("🛍️ *NUEVO PEDIDO " + storeName.toUpperCase() + "*\n\n");
        sb.append("📋 *Pedido:* ").append(order.getOrderNumber()).append("\n");
        sb.append("👤 *Cliente:* ").append(order.getCustomerName()).append("\n");
        sb.append("📧 *Email:* ").append(order.getCustomerEmail()).append("\n");
        if (order.getPhone() != null) sb.append("📱 *Tel:* ").append(order.getPhone()).append("\n");
        if (order.getCity() != null) sb.append("🏙️ *Ciudad:* ").append(order.getCity()).append("\n");
        sb.append("📍 *Dirección:* ").append(order.getShippingAddress() != null ? order.getShippingAddress() : "No especificada").append("\n");
        sb.append("💰 *Total:* $").append(order.getTotal()).append(" COP\n");
        if (order.getItems() != null) {
            sb.append("\n📦 *Productos:*\n");
            for (OrderItem item : order.getItems()) {
                String name = item.getProduct() != null ? item.getProduct().getName() : "Producto";
                sb.append("• ").append(name).append(" x").append(item.getQuantity()).append("\n");
            }
        }
        return sb.toString();
    }

    private String buildClientWhatsappMsg(Order order) {
        return "✅ *¡Hola " + order.getCustomerName() + "!*\n\n"
            + "Tu pedido en *" + storeName + "* fue confirmado 🎉\n\n"
            + "📋 *Pedido:* " + order.getOrderNumber() + "\n"
            + "💰 *Total:* $" + order.getTotal() + " COP\n\n"
            + "Te avisaremos cuando tu pedido esté en camino 🚚\n"
            + "¿Dudas? Escríbenos aquí mismo 💕";
    }

    private String buildStatusWhatsappMsg(Order order) {
        return switch (order.getStatus()) {
            case PROCESSING -> "📦 *Hola " + order.getCustomerName() + "!*\n\n"
                + "Estamos preparando tu pedido *" + order.getOrderNumber() + "*\n"
                + "¡Pronto estará listo para enviarte! 🎁";
            case SHIPPED -> "🚚 *¡Tu pedido está en camino!*\n\n"
                + "Pedido: *" + order.getOrderNumber() + "*\n"
                + "Dirección: " + order.getShippingAddress() + "\n\n"
                + "¡Pronto llegará a tus manos! 💜";
            case DELIVERED -> "🎉 *¡Tu pedido llegó!*\n\n"
                + "Pedido: *" + order.getOrderNumber() + "*\n\n"
                + "Esperamos que ames tu compra 💕\n"
                + "¡Gracias por confiar en " + storeName + "!";
            case CANCELLED -> "❌ *Tu pedido fue cancelado*\n\n"
                + "Pedido: *" + order.getOrderNumber() + "*\n\n"
                + "¿Tienes dudas? Escríbenos y te ayudamos 💜";
            default -> null;
        };
    }

    private String buildGiftCardEmailHtml(GiftCard gc) {
        String occasion    = gc.getOccasionLabel() != null ? gc.getOccasionLabel() : gc.getOccasion();
        String amount      = "$" + gc.getOriginalAmount().toPlainString().replaceAll("\\.00$", "");
        String senderMsg   = (gc.getMessage() != null && !gc.getMessage().isBlank()) ? gc.getMessage() : "";
        String occasionEmoji = getOccasionEmoji(gc.getOccasion());

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'/>"
            + "<style>body{margin:0;padding:0;background:#FFF5F9;font-family:'Helvetica Neue',Arial,sans-serif}"
            + ".hero{background:linear-gradient(135deg,#7C3AED 0%,#C026D3 50%,#EC4899 100%);padding:40px 32px;text-align:center}"
            + ".code-section{background:linear-gradient(135deg,#7C3AED,#C026D3);border-radius:20px;padding:28px;text-align:center;margin:0 0 24px}"
            + ".cta{display:block;background:linear-gradient(135deg,#7C3AED,#C026D3);color:#fff;text-decoration:none;text-align:center;padding:16px 32px;border-radius:50px;font-weight:700;font-size:1rem;margin:0 0 24px}"
            + "</style></head><body>"
            + "<div style='max-width:560px;margin:0 auto;padding:24px 16px'>"
            + "<div style='background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(124,58,237,.13)'>"
            + "<div class='hero'>"
            + "<div style='color:rgba(255,255,255,.9);font-size:.78rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px'>" + storeName + "</div>"
            + "<div style='display:inline-block;background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.4);border-radius:50px;padding:6px 18px;color:#fff;font-size:.82rem;margin-bottom:20px'>" + occasionEmoji + " " + occasion + "</div>"
            + "<div style='font-size:3.5rem;margin-bottom:12px'>🎁</div>"
            + "<h1 style='color:#fff;font-size:1.6rem;font-weight:800;margin:0 0 6px'>¡Tienes una Tarjeta de Regalo!</h1>"
            + "<p style='color:rgba(255,255,255,.85);margin:0'>" + gc.getSenderName() + " tiene un regalo para ti</p>"
            + "<div style='background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.4);border-radius:16px;display:inline-block;padding:12px 32px;margin:20px 0 0'>"
            + "<div style='color:rgba(255,255,255,.8);font-size:.72rem;letter-spacing:1px;text-transform:uppercase'>Saldo disponible</div>"
            + "<div style='color:#fff;font-size:2.4rem;font-weight:900'>" + amount + " COP</div>"
            + "</div></div>"
            + "<div style='padding:32px'>"
            + "<p style='color:#1a1a2e;font-size:1.05rem;margin-bottom:16px'>Hola <strong>" + gc.getRecipientName() + "</strong> 💜</p>"
            + (senderMsg.isBlank() ? "" : "<div style='background:linear-gradient(135deg,#faf5ff,#fdf2f8);border-left:4px solid #C026D3;border-radius:0 12px 12px 0;padding:16px 20px;margin:0 0 24px;color:#6B21A8;font-style:italic'>\"" + escapeHtml(senderMsg) + "\"<br/><small style='color:#9CA3AF'>— " + gc.getSenderName() + "</small></div>")
            + "<div class='code-section'>"
            + "<div style='color:rgba(255,255,255,.75);font-size:.72rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px'>Tu código de regalo</div>"
            + "<div style='color:#fff;font-size:2rem;font-weight:900;letter-spacing:5px;font-family:monospace'>" + gc.getCode() + "</div>"
            + "<div style='color:rgba(255,255,255,.7);font-size:.78rem;margin-top:10px'>Cópialo y úsalo al finalizar tu compra</div>"
            + "</div>"
            + "<a href='" + storeUrl + "' class='cta'>¡Ir a usar mi tarjeta de regalo! →</a>"
            + "<p style='text-align:center;color:#9CA3AF;font-size:.78rem'>Saldo: <strong>" + amount + " COP</strong> · Válida por 1 año<br/>¿Preguntas? <strong>" + storeEmail + "</strong></p>"
            + "</div></div>"
            + "<p style='text-align:center;color:#C4B5FD;font-size:.7rem;margin-top:20px'>© 2025 " + storeName + "</p>"
            + "</div></body></html>";
    }

    private String getOccasionEmoji(String occasion) {
        if (occasion == null) return "🎁";
        return switch (occasion.toLowerCase()) {
            case "birthday"    -> "🎂";
            case "mother"      -> "💐";
            case "father"      -> "👔";
            case "love"        -> "💑";
            case "christmas"   -> "🎄";
            case "graduation"  -> "🎓";
            case "anniversary" -> "💍";
            default            -> "✨";
        };
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
