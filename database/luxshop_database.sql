-- ============================================================
--  KOSMICA — luxshop_database.sql
--  ✅ Schema inicial completo para Docker (docker-compose)
--     y referencia para Supabase / Render
--  ✅ Todas las tablas del proyecto
--  ✅ status gift_cards usa 'USED' (no 'DEPLETED')
--  ✅ Incluye push_subscriptions, reviews, referral_codes
--  ✅ Trigger updated_at automático en products y orders
--  ✅ Índices optimizados para las consultas del backend
--
--  Montado por docker-compose como:
--  ./database/luxshop_database.sql:/docker-entrypoint-initdb.d/01_schema.sql
-- ============================================================
 
-- ══════════════════════════════════════════════════════════════
--  EXTENSIONES
-- ══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 
 
-- ══════════════════════════════════════════════════════════════
--  FUNCIÓN updated_at (reutilizada por products y orders)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
 
-- ══════════════════════════════════════════════════════════════
--  1. CATEGORÍAS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS categories (
    id    BIGSERIAL    PRIMARY KEY,
    name  VARCHAR(100) NOT NULL UNIQUE
);
 
INSERT INTO categories (name) VALUES
    ('Fragancias'),
    ('Skincare'),
    ('Maquillaje'),
    ('Cabello'),
    ('Accesorios')
ON CONFLICT (name) DO NOTHING;
 
 
-- ══════════════════════════════════════════════════════════════
--  2. PRODUCTOS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS products (
    id              BIGSERIAL      PRIMARY KEY,
    name            VARCHAR(200)   NOT NULL,
    description     TEXT,
    price           DECIMAL(12,2)  NOT NULL CHECK (price >= 0),
    original_price  DECIMAL(12,2),                      -- precio tachado antes de descuento
    category        VARCHAR(100)   NOT NULL DEFAULT '',
    image_url       VARCHAR(500),
    image_url2      VARCHAR(500),
    image_url3      VARCHAR(500),
    video_url       VARCHAR(500),                        -- video Cloudinary
    stock           INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
    featured        BOOLEAN        NOT NULL DEFAULT FALSE,
    active          BOOLEAN        NOT NULL DEFAULT TRUE,
    brand           VARCHAR(100),
    sku             VARCHAR(50)    UNIQUE,
    weight_grams    INTEGER,
    tags            TEXT,                                -- etiquetas separadas por coma
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_featured  ON products (featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_active    ON products (active)   WHERE active   = TRUE;
 
DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
 
 
-- ══════════════════════════════════════════════════════════════
--  3. USUARIOS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id                   BIGSERIAL    PRIMARY KEY,
    name                 VARCHAR(100) NOT NULL,
    email                VARCHAR(150) NOT NULL UNIQUE,
    -- Perfil
    phone                VARCHAR(20),
    document             VARCHAR(30),
    city                 VARCHAR(100),
    neighborhood         VARCHAR(100),
    address              TEXT,
    -- Consentimiento de datos
    data_consent         BOOLEAN      NOT NULL DEFAULT FALSE,
    data_consent_at      TIMESTAMP,
    -- Puntos Kosmica
    points               INTEGER      NOT NULL DEFAULT 0 CHECK (points >= 0),
    -- Racha de check-in diario
    checkin_streak       INTEGER      NOT NULL DEFAULT 0 CHECK (checkin_streak >= 0),
    last_checkin_date    DATE,
    -- Racha de compras
    purchase_streak      INTEGER      NOT NULL DEFAULT 0 CHECK (purchase_streak >= 0),
    last_purchase_date   DATE,
    -- Timestamps
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
 
 
-- ══════════════════════════════════════════════════════════════
--  4. PEDIDOS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS orders (
    id                  BIGSERIAL      PRIMARY KEY,
    order_number        VARCHAR(30)    NOT NULL UNIQUE,
    -- Cliente
    customer_name       VARCHAR(150)   NOT NULL,
    customer_email      VARCHAR(150)   NOT NULL,
    phone               VARCHAR(20),
    document            VARCHAR(30),
    city                VARCHAR(100),
    neighborhood        VARCHAR(100),
    shipping_address    TEXT,
    notes               TEXT,
    -- Montos
    subtotal            DECIMAL(12,2)  NOT NULL DEFAULT 0,
    shipping_cost       DECIMAL(12,2)  NOT NULL DEFAULT 0,
    coupon_discount     DECIMAL(12,2)  NOT NULL DEFAULT 0,
    gift_card_discount  DECIMAL(12,2)  NOT NULL DEFAULT 0,
    total               DECIMAL(12,2)  NOT NULL DEFAULT 0,
    -- Estado y pago
    status              VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED')),
    payment_id          VARCHAR(100),
    payment_method      VARCHAR(50)    DEFAULT 'MERCADOPAGO',
    -- Descuentos aplicados
    coupon_code         VARCHAR(50),
    gift_card_code      VARCHAR(20),
    referral_code       VARCHAR(20),
    -- Timestamps
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP      NOT NULL DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_orders_email      ON orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_number     ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_referral   ON orders (referral_code);
CREATE INDEX IF NOT EXISTS idx_orders_gift_card  ON orders (gift_card_code);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders (payment_id);
 
DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
 
 
-- ══════════════════════════════════════════════════════════════
--  5. ITEMS DE PEDIDO
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS order_items (
    id            BIGSERIAL      PRIMARY KEY,
    order_id      BIGINT         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id    BIGINT         REFERENCES products(id) ON DELETE SET NULL,
    product_name  VARCHAR(200)   NOT NULL,   -- nombre al momento de la compra
    quantity      INTEGER        NOT NULL CHECK (quantity > 0),
    unit_price    DECIMAL(12,2)  NOT NULL CHECK (unit_price >= 0),
    image_url     VARCHAR(500)
);
 
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);
 
 
-- ══════════════════════════════════════════════════════════════
--  6. REFERRAL CODES — "Invita y Gana"
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS referral_codes (
    id                          BIGSERIAL    PRIMARY KEY,
    code                        VARCHAR(20)  NOT NULL UNIQUE,
    owner_email                 VARCHAR(150) NOT NULL,
    owner_name                  VARCHAR(100),
    owner_phone                 VARCHAR(20),
    data_consent                BOOLEAN      NOT NULL DEFAULT FALSE,
    data_consent_at             TIMESTAMP,
    used                        BOOLEAN      NOT NULL DEFAULT FALSE,
    redeemed_by_email           VARCHAR(150),
    redeemed_by_name            VARCHAR(100),
    redeemed_in_order           VARCHAR(30),
    redeemed_at                 TIMESTAMP,
    reward_coupon_code          VARCHAR(20),
    reward_coupon_generated_at  TIMESTAMP,
    created_at                  TIMESTAMP    NOT NULL DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_ref_code        ON referral_codes (code);
CREATE INDEX IF NOT EXISTS idx_ref_owner_email ON referral_codes (owner_email);
CREATE INDEX IF NOT EXISTS idx_ref_redeemer    ON referral_codes (redeemed_by_email);
 
 
-- ══════════════════════════════════════════════════════════════
--  7. GIFT CARDS
--     ✅ CHECK (status IN ('PENDING','ACTIVE','USED','EXPIRED','CANCELLED'))
--        'USED'  = saldo agotado  (GiftCardService.java usa "USED", no "DEPLETED")
--        expires_at se calcula automáticamente: 1 año desde activated_at (o created_at)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gift_cards (
    id               BIGSERIAL      PRIMARY KEY,
    code             VARCHAR(20)    NOT NULL UNIQUE,
    occasion         VARCHAR(30)    NOT NULL,
    occasion_label   VARCHAR(60),
    original_amount  DECIMAL(12,2)  NOT NULL CHECK (original_amount > 0),
    balance          DECIMAL(12,2)  NOT NULL CHECK (balance >= 0),
    message          TEXT,
    recipient_name   VARCHAR(100)   NOT NULL,
    recipient_email  VARCHAR(150)   NOT NULL,
    sender_name      VARCHAR(100)   NOT NULL,
    sender_email     VARCHAR(150)   NOT NULL,
    sender_phone     VARCHAR(20),
    status           VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','ACTIVE','USED','EXPIRED','CANCELLED')),
    payment_id       VARCHAR(100),
    created_at       TIMESTAMP      NOT NULL DEFAULT NOW(),
    activated_at     TIMESTAMP,
    expires_at       TIMESTAMP
                         GENERATED ALWAYS AS (
                             COALESCE(activated_at, created_at) + INTERVAL '1 year'
                         ) STORED
);
 
CREATE INDEX IF NOT EXISTS idx_gc_code      ON gift_cards (code);
CREATE INDEX IF NOT EXISTS idx_gc_recipient ON gift_cards (recipient_email);
CREATE INDEX IF NOT EXISTS idx_gc_sender    ON gift_cards (sender_email);
CREATE INDEX IF NOT EXISTS idx_gc_status    ON gift_cards (status);
 
 
-- ══════════════════════════════════════════════════════════════
--  8. GIFT CARD TRANSACTIONS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gift_card_transactions (
    id                  BIGSERIAL      PRIMARY KEY,
    gift_card_id        BIGINT         NOT NULL REFERENCES gift_cards(id),
    order_number        VARCHAR(30),
    amount_used         DECIMAL(12,2)  NOT NULL,
    balance_before      DECIMAL(12,2)  NOT NULL,
    balance_after       DECIMAL(12,2)  NOT NULL,
    redeemed_by_email   VARCHAR(150),
    type                VARCHAR(20)    NOT NULL DEFAULT 'REDEEM'
                            CHECK (type IN ('REDEEM','REFUND','LOAD')),
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_gct_gift_card ON gift_card_transactions (gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gct_order     ON gift_card_transactions (order_number);
 
 
-- ══════════════════════════════════════════════════════════════
--  9. RESEÑAS DE PRODUCTOS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reviews (
    id          BIGSERIAL    PRIMARY KEY,
    product_id  BIGINT       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_name   VARCHAR(100),
    user_email  VARCHAR(150),
    rating      SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    photo_url   VARCHAR(500),
    verified    BOOLEAN      NOT NULL DEFAULT FALSE,
    approved    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_review_product  ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_review_approved ON reviews (product_id, approved);
 
 
-- ══════════════════════════════════════════════════════════════
--  10. PUSH SUBSCRIPTIONS — Notificaciones web (PWA)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         BIGSERIAL    PRIMARY KEY,
    endpoint   VARCHAR(500) NOT NULL UNIQUE,
    p256dh     VARCHAR(255) NOT NULL,
    auth       VARCHAR(255) NOT NULL,
    email      VARCHAR(150),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    active     BOOLEAN      NOT NULL DEFAULT TRUE
);
 
CREATE INDEX IF NOT EXISTS idx_push_active ON push_subscriptions (active);
CREATE INDEX IF NOT EXISTS idx_push_email  ON push_subscriptions (email);
 
 
-- ══════════════════════════════════════════════════════════════
--  VERIFICACIÓN FINAL
-- ══════════════════════════════════════════════════════════════
SELECT tabla, columnas FROM (
    SELECT '01. categories'             AS tabla, COUNT(*) AS columnas FROM information_schema.columns WHERE table_name = 'categories'
    UNION ALL
    SELECT '02. products'               AS tabla, COUNT(*) AS columnas FROM information_schema.columns WHERE table_name = 'products'
    UNION ALL
    SELECT '03. users'                  AS tabla, COUNT(*) AS columnas FROM information_schema.columns WHERE table_name = 'users'
    UNION ALL
    SELECT '04. orders'                 AS tabla, COUNT(*) AS columnas FROM information_schema.columns WHERE table_name = 'orders'
    UNION ALL
    SELECT '05. order_items'            AS tabla, COUNT(*) AS columnas FROM information_schema.columns WHERE table_name = 'order_items'
    UNION ALL
    SELECT '06. referral_codes'         AS tabla, COUNT(*) AS columnas FROM information_schema.columns WHERE table_name = 'referral_codes'
    UNION ALL
    SELECT '07. gift_cards'             AS tabla, COUNT(*) AS columnas FROM information_schema.columns WHERE table_name = 'gift_cards'
    UNION ALL
    SELECT '08. gift_card_transactions' AS tabla, COUNT(*) AS columnas FROM information_schema.columns WHERE table_name = 'gift_card_transactions'
    UNION ALL
    SELECT '09. reviews'                AS tabla, COUNT(*) AS columnas FROM information_schema.columns WHERE table_name = 'reviews'
    UNION ALL
    SELECT '10. push_subscriptions'     AS tabla, COUNT(*) AS columnas FROM information_schema.columns WHERE table_name = 'push_subscriptions'
) r ORDER BY tabla;
 
SELECT '🚀 Kosmica — luxshop_database.sql inicializado correctamente' AS resultado;
 