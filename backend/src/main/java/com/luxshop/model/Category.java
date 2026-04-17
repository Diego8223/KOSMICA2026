package com.luxshop.model;

/**
 * Enum de categorías — solo se usa en el Controller para recibir
 * el parámetro de filtro como tipo fuerte. El campo category en
 * Product es String para ser compatible con el VARCHAR(100) de Postgres.
 */
public enum Category {
    BOLSOS, BILLETERAS, MAQUILLAJE, CAPILAR, CUIDADO_PERSONAL, ACCESORIOS;

    /** Devuelve el nombre del enum como String, para pasarlo al repositorio. */
    public String toDbValue() {
        return this.name();
    }
}
