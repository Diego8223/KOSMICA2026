package com.luxshop.service;

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

    // ✅ Número WhatsApp del admin para notificaciones (configura en Render env vars)
    @Value("${admin.whatsapp:}")
    private String adminWhatsapp;

    // ✅ API key de CallMeBot para WhatsApp (gratis, ver instrucciones abajo)
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
        // Email al cliente
        if (isEmailConfigured()) {
            sendEmail(order.getCustomerEmail(), order.getCustomerName(),
                "✅ Pedido confirmado — " + order.getOrderNumber(),
                buildConfirmationHtml(order));
            sendAdminAlert(order);
        } else {
            log.warn("SendGrid no configurado — email omitido");
        }

        // ✅ WhatsApp al admin cuando llega un pedido nuevo
        if (isWhatsappConfigured()) {
            String msg = buildAdminWhatsappMsg(order);
            sendWhatsapp(adminWhatsapp, msg);
        }

        // ✅ WhatsApp al cliente si tiene teléfono registrado
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

        // ✅ WhatsApp al cliente cuando cambia el estado
        if (isWhatsappConfigured() && order.getPhone() != null && !order.getPhone().isBlank()) {
            String clientPhone = order.getPhone().replaceAll("[^0-9]", "");
            if (!clientPhone.startsWith("57")) clientPhone = "57" + clientPhone;
            String waMsg = buildStatusWhatsappMsg(order);
            if (waMsg != null) sendWhatsapp(clientPhone, waMsg);
        }
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
}
