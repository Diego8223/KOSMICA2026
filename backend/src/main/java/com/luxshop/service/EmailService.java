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

    private boolean isEmailConfigured() {
        return sendgridKey != null && sendgridKey.startsWith("SG.");
    }

    private boolean isWhatsappConfigured() {
        return adminWhatsapp != null && !adminWhatsapp.isBlank()
            && callmebotKey != null && !callmebotKey.isBlank();
    }

    // ── Confirmación nuevo pedido ─────────────────────────────
    public void sendOrderConfirmation(Order order) {
        if (isEmailConfigured()) {
            sendEmail(order.getCustomerEmail(), order.getCustomerName(),
                "✅ Pedido confirmado — " + order.getOrderNumber(),
                buildConfirmationHtml(order));
            sendAdminAlert(order);
        } else {
            log.warn("SendGrid no configurado — email omitido");
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
            log.warn("SendGrid no configurado — email de cupón omitido");
            return;
        }
        String html = buildWelcomeCouponHtml(toEmail, code);
        sendEmail(toEmail, "Amiga Kosmica",
            "💜 Tu código de descuento exclusivo — " + code, html);
    }

    // ── Email de bienvenida al registrarse ───────────────────
    public void sendWelcomeEmail(String toEmail, String toName) {
        if (!isEmailConfigured()) {
            log.warn("SendGrid no configurado — email de bienvenida omitido para {}", toEmail);
            return;
        }
        String html = buildWelcomeRegisterHtml(toName);
        sendEmail(toEmail, toName,
            "💜 ¡Bienvenida a Kosmica, " + toName.split(" ")[0] + "!", html);
        log.info("✉️ Email de bienvenida enviado a {}", toEmail);
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
            + "👉 Compra aquí: " + storeUrl + "\n\n"
            + "¡Te esperamos! 💜";
        sendWhatsapp(phone, msg);
    }

    // ── Recompensa de referido (15%) al dueño del código ─────
    public void sendReferralReward(String ownerEmail, String ownerName,
                                   String ownerPhone, String redeemerName,
                                   String rewardCoupon) {
        // ── Email HTML ──
        if (isEmailConfigured()) {
            String subject = "🎉 ¡" + (redeemerName != null ? redeemerName : "Tu amiga")
                + " compró con tu código! Aquí está tu 15% — " + storeName;
            String html = buildReferralRewardHtml(ownerName, redeemerName, rewardCoupon);
            sendEmail(ownerEmail, ownerName, subject, html);
        } else {
            log.warn("SendGrid no configurado — email de recompensa omitido para {}", ownerEmail);
        }

        // ── WhatsApp ──
        if (isWhatsappConfigured() && ownerPhone != null && !ownerPhone.isBlank()) {
            String phone = ownerPhone.replaceAll("[^0-9]", "");
            if (!phone.startsWith("57")) phone = "57" + phone;
            String msg = "🎉 ¡Hola *" + ownerName + "*! Tienes una recompensa en *Kosmica* 💜\n\n"
                + "Tu amiga *" + (redeemerName != null ? redeemerName : "alguien") + "* acaba de hacer\n"
                + "su primera compra con tu código de referido.\n\n"
                + "🎁 *¡Ganaste un 15% de descuento para tu próxima compra!*\n\n"
                + "Tu cupón exclusivo:\n"
                + "🏷️ *" + rewardCoupon + "*\n\n"
                + "📌 Cómo usarlo:\n"
                + "1. Ingresa al carrito en " + storeUrl + "\n"
                + "2. En el campo de cupón escribe: *" + rewardCoupon + "*\n"
                + "3. Ingresa tu email *" + ownerEmail + "* para validarlo\n"
                + "4. ¡Listo! 15% de descuento aplicado 🛍️\n\n"
                + "💜 ¡Gracias por recomendar Kosmica!";
            sendWhatsapp(phone, msg);
        } else {
            log.warn("WhatsApp no configurado o sin teléfono — notificación de recompensa omitida para {}", ownerEmail);
        }
    }

    // ════════════════════════════════════════════════════════════
    //  NUEVO: Tarjeta de Regalo — Email + WhatsApp al receptor
    // ════════════════════════════════════════════════════════════

    /**
     * Envía la tarjeta de regalo al receptor por EMAIL y WHATSAPP al sender.
     * Se llama cuando MercadoPago confirma el pago (webhook).
     */
    public void sendGiftCardNotifications(GiftCard gc) {
        // ── Email al RECEPTOR ──
        if (isEmailConfigured()) {
            String subject = gc.getSenderName() + " te envió una Tarjeta de Regalo " + storeName + " 🎁";
            String html = buildGiftCardEmailHtml(gc);
            sendEmail(gc.getRecipientEmail(), gc.getRecipientName(), subject, html);
            log.info("✉️ Tarjeta regalo {} enviada por email a {}", gc.getCode(), gc.getRecipientEmail());
        } else {
            log.warn("SendGrid no configurado — email de tarjeta regalo omitido");
        }

        // ── WhatsApp al RECEPTOR (si el sender proporcionó teléfono del receptor — no tenemos, enviamos al sender) ──
        // Enviamos al SENDER para que sepa que la tarjeta fue enviada
        if (isWhatsappConfigured() && gc.getSenderPhone() != null && !gc.getSenderPhone().isBlank()) {
            String senderPhone = gc.getSenderPhone().replaceAll("[^0-9]", "");
            if (!senderPhone.startsWith("57")) senderPhone = "57" + senderPhone;

            String msgSender = "✅ *¡Tu tarjeta de regalo fue enviada!* 🎁\n\n"
                + "Hola *" + gc.getSenderName() + "*, confirmamos que la tarjeta para *" + gc.getRecipientName() + "* ya fue procesada.\n\n"
                + "🎀 *Ocasión:* " + (gc.getOccasionLabel() != null ? gc.getOccasionLabel() : gc.getOccasion()) + "\n"
                + "💰 *Saldo:* $" + gc.getOriginalAmount() + " COP\n"
                + "🏷️ *Código:* *" + gc.getCode() + "*\n\n"
                + "El código ya fue enviado al correo de *" + gc.getRecipientName() + "*.\n"
                + "Puede usarlo en " + storeUrl + " al finalizar su compra 💜";
            sendWhatsapp(senderPhone, msgSender);
            log.info("📱 WhatsApp de confirmación enviado al sender {}", gc.getSenderPhone());
        }

        // ── WhatsApp al RECEPTOR con el código (mensaje de regalo) ──
        // Nota: solo si tienes el teléfono del receptor; por ahora enviamos el mensaje al sender
        // para que lo reenvíe si quiere. Si en el futuro se agrega recipientPhone, se usa aquí.
        log.info("🎁 Notificaciones de gift card {} completadas", gc.getCode());
    }

    // ── HTML correo tarjeta de regalo ────────────────────────
    private String buildGiftCardEmailHtml(GiftCard gc) {
        String occasion    = gc.getOccasionLabel() != null ? gc.getOccasionLabel() : gc.getOccasion();
        String amount      = "$" + gc.getOriginalAmount().toPlainString().replaceAll("\\.00$", "");
        String senderMsg   = (gc.getMessage() != null && !gc.getMessage().isBlank())
                             ? gc.getMessage() : "";
        String occasionEmoji = getOccasionEmoji(gc.getOccasion());

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'/>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'/>"
            + "<style>"
            + "body{margin:0;padding:0;background:#FFF5F9;font-family:'Helvetica Neue',Arial,sans-serif}"
            + ".wrap{max-width:560px;margin:0 auto;padding:24px 16px}"
            + ".card{background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(124,58,237,.13)}"
            + ".hero{background:linear-gradient(135deg,#7C3AED 0%,#C026D3 50%,#EC4899 100%);padding:40px 32px;text-align:center;position:relative}"
            + ".hero-deco{position:absolute;top:0;left:0;right:0;bottom:0;opacity:.12}"
            + ".hero-deco div{position:absolute;border-radius:50%;background:#fff}"
            + ".brand{color:rgba(255,255,255,.9);font-size:.78rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px}"
            + ".occasion-badge{display:inline-block;background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.4);border-radius:50px;padding:6px 18px;color:#fff;font-size:.82rem;margin-bottom:20px}"
            + ".emoji-big{font-size:3.5rem;margin-bottom:12px;display:block}"
            + ".hero-title{color:#fff;font-size:1.6rem;font-weight:800;margin:0 0 6px;line-height:1.2}"
            + ".hero-sub{color:rgba(255,255,255,.85);font-size:.9rem;margin:0}"
            + ".amount-box{background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.4);border-radius:16px;display:inline-block;padding:12px 32px;margin:20px 0 0}"
            + ".amount-label{color:rgba(255,255,255,.8);font-size:.72rem;letter-spacing:1px;text-transform:uppercase}"
            + ".amount-value{color:#fff;font-size:2.4rem;font-weight:900}"
            + ".body{padding:32px}"
            + ".greeting{color:#1a1a2e;font-size:1.05rem;margin-bottom:16px}"
            + ".message-box{background:linear-gradient(135deg,#faf5ff,#fdf2f8);border-left:4px solid #C026D3;border-radius:0 12px 12px 0;padding:16px 20px;margin:0 0 24px;color:#6B21A8;font-size:.95rem;font-style:italic;line-height:1.6}"
            + ".code-section{background:linear-gradient(135deg,#7C3AED,#C026D3);border-radius:20px;padding:28px;text-align:center;margin:0 0 24px}"
            + ".code-label{color:rgba(255,255,255,.75);font-size:.72rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px}"
            + ".code-value{color:#fff;font-size:2rem;font-weight:900;letter-spacing:5px;font-family:monospace}"
            + ".code-hint{color:rgba(255,255,255,.7);font-size:.78rem;margin-top:10px}"
            + ".steps{background:#fafafa;border-radius:14px;padding:20px 24px;margin:0 0 24px}"
            + ".steps-title{color:#1a1a2e;font-weight:700;font-size:.9rem;margin-bottom:12px}"
            + ".step{display:flex;align-items:flex-start;gap:12px;margin-bottom:10px}"
            + ".step-num{background:linear-gradient(135deg,#7C3AED,#C026D3);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;margin-top:1px}"
            + ".step-text{color:#4B5563;font-size:.85rem;line-height:1.5}"
            + ".cta{display:block;background:linear-gradient(135deg,#7C3AED,#C026D3);color:#fff;text-decoration:none;text-align:center;padding:16px 32px;border-radius:50px;font-weight:700;font-size:1rem;margin:0 0 24px}"
            + ".sender-note{text-align:center;color:#9CA3AF;font-size:.78rem;line-height:1.6}"
            + ".footer{text-align:center;color:#C4B5FD;font-size:.7rem;margin-top:20px;padding:0 16px}"
            + "</style></head><body>"
            + "<div class='wrap'>"
            + "<div class='card'>"
            // HERO
            + "<div class='hero'>"
            + "<div class='hero-deco'>"
            + "<div style='width:200px;height:200px;top:-60px;right:-60px'></div>"
            + "<div style='width:120px;height:120px;bottom:-40px;left:-30px'></div>"
            + "</div>"
            + "<div class='brand'>" + storeName + "</div>"
            + "<div class='occasion-badge'>" + occasionEmoji + " " + occasion + "</div>"
            + "<span class='emoji-big'>🎁</span>"
            + "<h1 class='hero-title'>¡Tienes una Tarjeta de Regalo!</h1>"
            + "<p class='hero-sub'>" + gc.getSenderName() + " tiene un regalo especial para ti</p>"
            + "<div class='amount-box'>"
            + "<div class='amount-label'>Saldo disponible</div>"
            + "<div class='amount-value'>" + amount + " COP</div>"
            + "</div>"
            + "</div>"
            // BODY
            + "<div class='body'>"
            + "<p class='greeting'>Hola <strong>" + gc.getRecipientName() + "</strong> 💜</p>"
            + (senderMsg.isBlank() ? "" :
                "<div class='message-box'>\"" + escapeHtml(senderMsg) + "\"<br/><small style='color:#9CA3AF;margin-top:8px;display:block'>— " + gc.getSenderName() + "</small></div>")
            // CÓDIGO
            + "<div class='code-section'>"
            + "<div class='code-label'>Tu código de regalo</div>"
            + "<div class='code-value'>" + gc.getCode() + "</div>"
            + "<div class='code-hint'>Cópialo y úsalo al finalizar tu compra</div>"
            + "</div>"
            // PASOS
            + "<div class='steps'>"
            + "<div class='steps-title'>¿Cómo usar tu tarjeta?</div>"
            + "<div class='step'><div class='step-num'>1</div><div class='step-text'>Elige tus productos favoritos en <strong>" + storeUrl + "</strong></div></div>"
            + "<div class='step'><div class='step-num'>2</div><div class='step-text'>En el carrito, busca el campo <strong>\"Tarjeta de regalo\"</strong></div></div>"
            + "<div class='step'><div class='step-num'>3</div><div class='step-text'>Ingresa tu código: <strong>" + gc.getCode() + "</strong></div></div>"
            + "<div class='step'><div class='step-num'>4</div><div class='step-text'>¡El descuento se aplica automáticamente! 🎉 Si sobra saldo, queda disponible para tu próxima compra.</div></div>"
            + "</div>"
            // CTA
            + "<a href='" + storeUrl + "' class='cta'>¡Ir a usar mi tarjeta de regalo! →</a>"
            + "<div class='sender-note'>"
            + "Esta tarjeta tiene un saldo de <strong>" + amount + " COP</strong> y es válida por 2 años.<br/>"
            + "¿Preguntas? Escríbenos a <strong>" + storeEmail + "</strong>"
            + "</div>"
            + "</div>"
            + "</div>"
            + "<p class='footer'>© 2025 " + storeName + " — Todos los derechos reservados</p>"
            + "</div>"
            + "</body></html>";
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

    private String buildReferralRewardHtml(String ownerName, String redeemerName, String rewardCoupon) {
        String friend = redeemerName != null ? redeemerName : "tu amiga";
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'/>"
            + "<style>body{font-family:Arial,sans-serif;background:#f5f0ff;margin:0;padding:20px}"
            + ".card{background:#fff;border-radius:16px;max-width:520px;margin:0 auto;padding:32px;box-shadow:0 4px 20px #7c3aed22}"
            + ".logo{text-align:center;font-size:1.8rem;font-weight:800;color:#7C3AED;margin-bottom:8px}"
            + ".hero{text-align:center;font-size:2.5rem;margin:16px 0 8px}"
            + "h1{text-align:center;color:#1a1a1a;font-size:1.3rem;margin:0 0 16px}"
            + "p{color:#444;font-size:.97rem;line-height:1.6;margin:8px 0}"
            + ".coupon-box{background:linear-gradient(135deg,#7C3AED,#A855F7);border-radius:12px;padding:24px;text-align:center;margin:24px 0}"
            + ".coupon-label{color:#e9d5ff;font-size:.8rem;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}"
            + ".coupon-code{color:#fff;font-size:2rem;font-weight:900;letter-spacing:4px}"
            + ".coupon-pct{color:#e9d5ff;font-size:.9rem;margin-top:8px}"
            + ".steps{background:#faf5ff;border-radius:10px;padding:16px 20px;margin:16px 0}"
            + ".steps ol{margin:8px 0;padding-left:20px;color:#444;font-size:.9rem;line-height:1.8}"
            + ".btn{display:block;background:#7C3AED;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:50px;font-weight:700;font-size:1rem;margin:20px 0 0}"
            + ".footer{text-align:center;font-size:.78rem;color:#aaa;margin-top:20px}"
            + "</style></head><body>"
            + "<div class='card'>"
            + "<div class='logo'>Kosmica 💜</div>"
            + "<div class='hero'>🎉</div>"
            + "<h1>¡" + friend + " compró con tu código!</h1>"
            + "<p>Hola <strong>" + ownerName + "</strong>,</p>"
            + "<p><strong>" + friend + "</strong> acaba de hacer su primera compra en Kosmica usando tu código de referido. "
            + "¡Cumpliste tu promesa y ahora te toca disfrutar tu recompensa! 🛍️</p>"
            + "<div class='coupon-box'>"
            + "<div class='coupon-label'>Tu cupón exclusivo</div>"
            + "<div class='coupon-code'>" + rewardCoupon + "</div>"
            + "<div class='coupon-pct'>15% de descuento en tu próxima compra</div>"
            + "</div>"
            + "<div class='steps'>"
            + "<strong>¿Cómo usar tu cupón?</strong>"
            + "<ol>"
            + "<li>Agrega productos al carrito en kosmica.com.co</li>"
            + "<li>En el campo de cupón escribe: <strong>" + rewardCoupon + "</strong></li>"
            + "<li>Ingresa tu email para validar la titularidad</li>"
            + "<li>¡Listo! 15% aplicado automáticamente ✅</li>"
            + "</ol>"
            + "</div>"
            + "<a href='https://www.kosmica.com.co' class='btn'>¡Ir a comprar ahora! →</a>"
            + "<p class='footer'>Cupón de un solo uso. No acumulable con otras promociones.<br/>"
            + "¿Preguntas? Escríbenos a hola@kosmica.com.co 💜</p>"
            + "</div></body></html>";
    }

    // ── Mensajes WhatsApp ─────────────────────────────────────
    private String buildAdminWhatsappMsg(Order order) {
        StringBuilder sb = new StringBuilder();
        sb.append("🛍️ *NUEVO PEDIDO KOSMICA*\n\n");
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
            + "Tu pedido en *Kosmica* fue confirmado 🎉\n\n"
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
                + "¡Gracias por confiar en Kosmica!";
            case CANCELLED -> "❌ *Tu pedido fue cancelado*\n\n"
                + "Pedido: *" + order.getOrderNumber() + "*\n\n"
                + "¿Tienes dudas? Escríbenos y te ayudamos 💜";
            default -> null;
        };
    }

    // ── HTML correo bienvenida con cupón ──────────────────────
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
            + "<a href='" + storeUrl + "' style='display:inline-block;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:700;font-size:1rem'>Ir a comprar ahora →</a>"
            + "<p style='color:#C9B8E8;font-size:.78rem;margin-top:24px'>Válido solo para tu primera compra. No acumulable con otras promociones.</p>"
            + "</div>"
            + "<p style='text-align:center;color:#C9B8E8;font-size:.7rem;margin-top:14px'>© 2025 " + storeName + "</p>"
            + "</div></body></html>";
    }

    // ── HTML pedido confirmado ────────────────────────────────
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
            + "<div style='background:#FAF7FF;border-radius:14px;padding:16px 18px;margin-bottom:22px'>"
            + "<div style='font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#B8A0D8;margin-bottom:4px'>Número de pedido</div>"
            + "<div style='font-size:1.4rem;font-weight:700;color:#7B5EA7'>" + order.getOrderNumber() + "</div>"
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
            + "<b style='color:#2D1B4E;font-size:.83rem'>📍 Dirección:</b><br>"
            + "<span style='color:#6B5B8A;font-size:.82rem'>" + (order.getShippingAddress() != null ? order.getShippingAddress() : "No especificada") + "</span>"
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

    // ── Notificación admin por email ──────────────────────────
    private void sendAdminAlert(Order order) {
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
            + "<p><b>Pedido:</b> " + order.getOrderNumber() + "</p>"
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
            + "</div></div>";

        sendEmail(storeEmail, storeName,
            "🛍️ Nuevo pedido: " + order.getOrderNumber() + " — $" + total, html);
    }

    // ── Envío email via SendGrid ──────────────────────────────
    private void sendEmail(String toEmail, String toName, String subject, String html) {
        try {
            String body = "{\"personalizations\":[{\"to\":[{\"email\":\""
                + toEmail + "\",\"name\":\"" + toName.replace("\"","") + "\"}]}],"
                + "\"from\":{\"email\":\"" + storeEmail + "\",\"name\":\"" + storeName + "\"},"
                + "\"subject\":\"" + subject.replace("\"","'") + "\","
                + "\"content\":[{\"type\":\"text/html\",\"value\":"
                + "\"" + html.replace("\\","\\\\").replace("\"","\\\"")
                            .replace("\n","\\n").replace("\r","") + "\"}]}";

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.sendgrid.com/v3/mail/send"))
                .header("Authorization", "Bearer " + sendgridKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> resp = HttpClient.newHttpClient()
                .send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 202)
                log.info("✉️ Email enviado a {}", toEmail);
            else
                log.error("SendGrid error {}: {}", resp.statusCode(), resp.body());

        } catch (Exception e) {
            log.error("Error enviando email: {}", e.getMessage());
        }
    }

    // ── Envío WhatsApp via CallMeBot ──────────────────────────
    private void sendWhatsapp(String phone, String message) {
        try {
            String encoded = URLEncoder.encode(message, StandardCharsets.UTF_8);
            String url = "https://api.callmebot.com/whatsapp.php?phone=" + phone
                + "&text=" + encoded + "&apikey=" + callmebotKey;

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

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
    // ── HTML bienvenida por registro ─────────────────────────
    private String buildWelcomeRegisterHtml(String name) {
        String firstName = name != null && !name.isBlank() ? name.split(" ")[0] : "amiga";
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#F5F0FF;font-family:Arial,sans-serif'>"
            + "<div style='max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(45,27,78,.1)'>"
            + "<div style='background:linear-gradient(135deg,#9B72CF,#7C3AED);padding:40px 32px;text-align:center'>"
            + "<div style='font-size:2.5rem;margin-bottom:8px'>✦</div>"
            + "<h1 style='color:#fff;font-size:1.8rem;margin:0;font-weight:800'>¡Bienvenida a Kosmica!</h1>"
            + "<p style='color:rgba(255,255,255,.85);margin:8px 0 0;font-size:1rem'>Tu cuenta ha sido creada exitosamente</p>"
            + "</div>"
            + "<div style='padding:32px'>"
            + "<p style='color:#2D1B4E;font-size:1.1rem;font-weight:700;margin-bottom:16px'>Hola " + firstName + " 💜</p>"
            + "<p style='color:#6B7280;font-size:.95rem;line-height:1.6;margin-bottom:24px'>Estamos felices de tenerte en nuestra comunidad. Ya puedes disfrutar de todos los beneficios de tu cuenta:</p>"
            + "<div style='background:#F5F0FF;border-radius:12px;padding:20px;margin-bottom:24px'>"
            + "<div style='margin-bottom:12px;font-size:.9rem;color:#4C1D95'><span style='margin-right:8px'>⚡</span>Checkout en 1 clic — sin volver a llenar datos</div>"
            + "<div style='margin-bottom:12px;font-size:.9rem;color:#4C1D95'><span style='margin-right:8px'>💎</span>Acumulas 20 puntos Kosmica de bienvenida</div>"
            + "<div style='margin-bottom:12px;font-size:.9rem;color:#4C1D95'><span style='margin-right:8px'>🎁</span>Acceso a tarjetas de regalo y referidos</div>"
            + "<div style='font-size:.9rem;color:#4C1D95'><span style='margin-right:8px'>📦</span>Historial y rastreo de pedidos</div>"
            + "</div>"
            + "<a href='" + storeUrl + "' style='display:block;background:linear-gradient(135deg,#9B72CF,#7C3AED);color:#fff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:800;font-size:1rem;margin-bottom:24px'>✦ Ir a la tienda</a>"
            + "<p style='color:#9CA3AF;font-size:.8rem;text-align:center;margin:0'>Si no creaste esta cuenta, ignora este correo.</p>"
            + "</div>"
            + "<div style='background:#F9F7FF;padding:16px;text-align:center'>"
            + "<p style='color:#9CA3AF;font-size:.75rem;margin:0'>" + storeName + " · <a href='" + storeUrl + "' style='color:#9B72CF'>" + storeUrl + "</a></p>"
            + "</div></div></body></html>";
    }

}