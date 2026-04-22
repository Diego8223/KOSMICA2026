package com.luxshop.exception;

import lombok.extern.slf4j.Slf4j;
import org.hibernate.LazyInitializationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Errores de validación de negocio → 400 */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.debug("Validación de negocio fallida: {}", ex.getMessage());
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    /** Entidad no encontrada → 404 */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(EntityNotFoundException ex) {
        log.debug("Entidad no encontrada: {}", ex.getMessage());
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    /**
     * FIX: LazyInitializationException — ocurre cuando Jackson intenta serializar
     * una colección LAZY fuera de la sesión de Hibernate.
     * Devuelve 500 con mensaje genérico para no exponer detalles internos al cliente.
     */
    @ExceptionHandler(LazyInitializationException.class)
    public ResponseEntity<Map<String, Object>> handleLazyInit(LazyInitializationException ex) {
        log.error("LazyInitializationException — revisar FetchType en el modelo: {}", ex.getMessage());
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
            "Error interno del servidor. Por favor intenta de nuevo.");
    }

    /**
     * FIX: HttpMessageNotWritableException — Jackson no puede escribir la respuesta.
     * Causado frecuentemente por LazyInit o referencias circulares.
     */
    @ExceptionHandler(HttpMessageNotWritableException.class)
    public ResponseEntity<Map<String, Object>> handleNotWritable(HttpMessageNotWritableException ex) {
        log.error("Error serializando respuesta JSON: {}", ex.getMessage());
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
            "Error interno del servidor. Por favor intenta de nuevo.");
    }

    /** Cualquier otro RuntimeException inesperado → 500 */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        log.error("Error interno inesperado: {}", ex.getMessage(), ex);
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
            "Error interno del servidor. Por favor intenta de nuevo.");
    }

    /** Errores de validación de campos (@NotBlank, @Email, etc.) → 400 con detalle */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field = ((FieldError) error).getField();
            fieldErrors.put(field, error.getDefaultMessage());
        });
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", 400);
        body.put("error", "Datos inválidos");
        body.put("fields", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    private ResponseEntity<Map<String, Object>> buildError(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }
}
