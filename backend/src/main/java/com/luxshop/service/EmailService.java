package com.luxshop.service;

import com.luxshop.model.Order;
import com.luxshop.model.OrderItem;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Slf4j
@Service
public class EmailService {

    @Value("${sendgrid.api.key:}")
    private String sendgridKey;

    @Value("${store.email:hola@kosmica.com}")
    private String storeEmail;

    @Value("${store.name:Kosmica}")
    private String storeName;

    private boolean isConfigured() {
        return sendgridKey != null && sendgridKey.startsWith("SG.");
    }

    // ── Email de confirmación al cliente ──────────────────────
    public void sendOrderConfirmation(Order order) {
        if (!isConfigured()) { log.warn("SendGrid no configurado — confirmación omitida"); return; }
        sendEmail(order.getCustomerEmail(), order.getCustomerName(),
            "✅ Pedido confirmado — " + order.getOrderNumber(),
            buildConfirmationHtml(order));
        sendAdminAlert(order);
    }

    // ── Email de estado al cliente ────────────────────────────
    public void sendStatusUpdate(Order order) {
        if (!isConfigured()) { log.warn("SendGrid no configurado — estado omitido"); return; }
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
                msg   = "Tu pedido fue cancelado. Escríbenos si tienes dudas, con gusto te ayudamos.";
                color = "#C62828"; bg = "#FFEBEE";
            }
            default -> { return; }
        }
        sendEmail(order.getCustomerEmail(), order.getCustomerName(),
            subject, buildStatusHtml(order, title, msg, color, bg));
    }

    // ── Notificación al admin (nuevo pedido) ──────────────────
    private void sendAdminAlert(Order order) {
        StringBuilder rows = new StringBuilder();
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                // Usar getProduct().getName() y getUnitPrice() (campos reales de OrderItem)
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
            + "<h2 style='color:#fff;margin:0'>🛍️ Nuevo pedido en Kosmica</h2></div>"
            + "<div style='background:#fff;padding:24px;border:1px solid #F0E8FF;border-top:none;border-radius:0 0 16px 16px'>"
            + "<p><b>Pedido:</b> " + order.getOrderNumber() + "</p>"
            + "<p><b>Cliente:</b> " + order.getCustomerName() + " — " + order.getCustomerEmail() + "</p>"
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

    // ── HTML confirmación ─────────────────────────────────────
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
            + "<div style='background:#FAF7FF;border-radius:14px;padding:16px 18px;margin-bottom:22px;border:1px solid #F0E8FF'>"
            + "<div style='font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#B8A0D8;margin-bottom:4px'>Número de pedido</div>"
            + "<div style='font-size:1.4rem;font-weight:700;color:#7B5EA7'>" + order.getOrderNumber() + "</div>"
            + "<div style='font-size:.77rem;color:#9B72CF;margin-top:4px'>Guarda este número para rastrear tu pedido en nuestra tienda</div>"
            + "</div>"
            + "<h3 style='color:#2D1B4E;margin:0 0 12px;font-size:.93rem'>📦 Tu pedido</h3>"
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
            + "<p style='text-align:center;color:#C9B8E8;font-size:.7rem;margin-top:14px'>© 2025 " + storeName + " · Todos los derechos reservados</p>"
            + "</div></body></html>";
    }

    // ── HTML actualización de estado ──────────────────────────
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
            + "<div style='font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:" + color + ";margin-bottom:4px'>Pedido</div>"
            + "<div style='font-size:1.2rem;font-weight:700;color:#2D1B4E'>" + order.getOrderNumber() + "</div>"
            + "<div style='font-size:.77rem;color:#6B5B8A;margin-top:4px'>Total: $" + total + "</div></div>"
            + "<div style='background:#F0E8FF;border-radius:12px;padding:13px 16px;text-align:center'>"
            + "<p style='margin:0;color:#7B5EA7;font-size:.81rem'>¿Preguntas? <b>" + storeEmail + "</b></p></div>"
            + "</div>"
            + "<p style='text-align:center;color:#C9B8E8;font-size:.7rem;margin-top:14px'>© 2025 " + storeName + "</p>"
            + "</div></body></html>";
    }

    // ── Envío real a SendGrid ─────────────────────────────────
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
            log.error("Error enviando email a {}: {}", toEmail, e.getMessage());
        }
    }
}
