package com.luxshop.exception;

/**
 * Excepción para entidades no encontradas en la base de datos.
 * Produce HTTP 404 en lugar del 400/500 genérico.
 *
 * Uso:
 *   throw new EntityNotFoundException("Producto no encontrado: " + id);
 *   throw new EntityNotFoundException("Pedido no encontrado: " + orderNumber);
 */
public class EntityNotFoundException extends RuntimeException {
    public EntityNotFoundException(String message) {
        super(message);
    }
}
