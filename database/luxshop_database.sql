-- ============================================================
--  LuxShop - Esquema MySQL Completo
--  Ejecutar en orden: CREATE DATABASE → tablas → datos demo
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Crear base de datos
-- ─────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS luxshop
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE luxshop;

-- ─────────────────────────────────────────────
-- 2. Tabla: users
-- ─────────────────────────────────────────────
CREATE TABLE users (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100)  NOT NULL,
    email      VARCHAR(150)  NOT NULL UNIQUE,
    phone      VARCHAR(20),
    address    TEXT,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- 3. Tabla: products
-- ─────────────────────────────────────────────
CREATE TABLE products (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(200)   NOT NULL,
    description    TEXT,
    price          DECIMAL(10,2)  NOT NULL,
    original_price DECIMAL(10,2),
    category       ENUM('BOLSOS','BILLETERAS','MAQUILLAJE','CAPILAR','ROPA') NOT NULL,
    badge          VARCHAR(50),                   -- VIRAL, HOT, BESTSELLER, NUEVO
    image_url      VARCHAR(500),
    video_url      VARCHAR(500),
    gallery        JSON,                           -- ["url1","url2",...]
    rating         DECIMAL(3,2)   DEFAULT 0.00,
    review_count   INT            DEFAULT 0,
    stock          INT            DEFAULT 0,
    active         TINYINT(1)     DEFAULT 1,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FULLTEXT INDEX ft_products (name, description),
    INDEX idx_category (category),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- 4. Tabla: orders
-- ─────────────────────────────────────────────
CREATE TABLE orders (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_number     VARCHAR(30)    NOT NULL UNIQUE,
    customer_name    VARCHAR(150)   NOT NULL,
    customer_email   VARCHAR(150)   NOT NULL,
    shipping_address TEXT,
    subtotal         DECIMAL(10,2)  NOT NULL,
    shipping_cost    DECIMAL(10,2)  DEFAULT 0.00,
    total            DECIMAL(10,2)  NOT NULL,
    status           ENUM('PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED')
                                    DEFAULT 'PENDING',
    payment_id       VARCHAR(200),   -- Stripe PaymentIntent ID
    payment_method   VARCHAR(50),
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_email  (customer_email),
    INDEX idx_order_status (status),
    INDEX idx_order_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- 5. Tabla: order_items
-- ─────────────────────────────────────────────
CREATE TABLE order_items (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id    BIGINT        NOT NULL,
    product_id  BIGINT        NOT NULL,
    quantity    INT           NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    subtotal    DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_item_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- 6. Tabla: reviews (opcional futuro)
-- ─────────────────────────────────────────────
CREATE TABLE reviews (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id  BIGINT     NOT NULL,
    user_name   VARCHAR(100),
    user_email  VARCHAR(150),
    rating      TINYINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    verified    TINYINT(1) DEFAULT 0,
    created_at  DATETIME   DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_review_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- 7. Datos de muestra (productos demo)
-- ─────────────────────────────────────────────
INSERT INTO products (name, description, price, original_price, category, badge, image_url, rating, review_count, stock) VALUES
-- BOLSOS
('Bolso Chanel Quilted Premium','Bolso acolchado estilo Chanel, cuero sintético de alta calidad con cadena dorada. Perfecto para ocasiones especiales.', 189.99, 259.99, 'BOLSOS', 'BESTSELLER', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500', 4.9, 234, 15),
('Tote Bag Cuero Premium','Bolso tote espacioso en cuero genuino, ideal para el día a día con estilo y funcionalidad.', 129.99, 179.99, 'BOLSOS', 'NUEVO', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500', 4.8, 187, 22),
('Mini Bag Dorada','Mini bolso metálico dorado, elegante y sofisticado. El accesorio perfecto para tus outfits de noche.', 89.99, 119.99, 'BOLSOS', 'HOT', 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=500', 4.7, 156, 18),
('Clutch Elegante Noche','Clutch de noche con detalles de cristales, cierre magnético y correa desmontable.', 74.99, 99.99, 'BOLSOS', NULL, 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=500', 4.6, 98, 30),

-- BILLETERAS
('Billetera Louis Inspired','Billetera inspirada en Louis Vuitton con monograma, múltiples compartimentos y cierre dorado.', 54.99, 79.99, 'BILLETERAS', 'VIRAL', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500', 4.9, 312, 45),
('Cartera Slim Cuero','Cartera ultradelgada en cuero italiano, porta 12 tarjetas + billetero.', 44.99, 64.99, 'BILLETERAS', 'BESTSELLER', 'https://images.unsplash.com/photo-1575032617751-6ddec2089882?w=500', 4.7, 201, 60),
('Monedero Boho Chic','Monedero estilo bohemio con bordados florales y cierre de cremallera dorado.', 29.99, 44.99, 'BILLETERAS', NULL, 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=500', 4.5, 143, 75),
('Wallet Card Holder Rose','Porta tarjetas minimalista en color rosa palo, cuero suave al tacto.', 34.99, 49.99, 'BILLETERAS', 'NUEVO', 'https://images.unsplash.com/photo-1601999109332-542b18dbec8e?w=500', 4.8, 178, 50),

-- MAQUILLAJE
('Paleta Glam 24 Sombras','Paleta de 24 sombras con acabados mate, shimmer y glitter. Pigmentación ultra intensa.', 49.99, 74.99, 'MAQUILLAJE', 'VIRAL', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500', 4.9, 456, 80),
('Set Labiales Luxury 6pcs','Set de 6 labiales de larga duración en los colores más trendy de la temporada.', 39.99, 59.99, 'MAQUILLAJE', 'HOT', 'https://images.unsplash.com/photo-1586495777744-4e6232bf2f04?w=500', 4.8, 389, 120),
('Base HD Flawless','Base de maquillaje cobertura total, fórmula HD que no se transfiere y dura 24 horas.', 34.99, 54.99, 'MAQUILLAJE', 'BESTSELLER', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500', 4.7, 267, 95),
('Kit Contorno Profesional','Kit de contorno con iluminador, bronzer y blush. Resultado profesional en casa.', 44.99, 64.99, 'MAQUILLAJE', NULL, 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=500', 4.6, 198, 70),

-- CAPILAR
('Aceite Argan Premium 100ml','Aceite de argán 100% puro, hidrata, nutre y da brillo intenso al cabello.', 29.99, 44.99, 'CAPILAR', 'VIRAL', 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=500', 4.9, 523, 150),
('Mascarilla Keratina 500g','Tratamiento de keratina profesional para alisar y reparar el cabello dañado.', 39.99, 59.99, 'CAPILAR', 'HOT', 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500', 4.8, 412, 200),
('Serum Reparador Puntas','Serum de 30ml para puntas abiertas, fórmula de proteínas de seda y keratina.', 34.99, 49.99, 'CAPILAR', 'BESTSELLER', 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500', 4.7, 334, 180),
('Set Rizos Perfectos 3pcs','Kit completo para definir y potenciar tus rizos: shampoo, crema y gel activador.', 49.99, 74.99, 'CAPILAR', 'NUEVO', 'https://images.unsplash.com/photo-1626015365107-338e2bcd5a1c?w=500', 4.6, 287, 110),

-- ROPA
('Vestido Maxi Floral','Vestido maxi de flores con escote cruzado, tela fluida, disponible en tallas S-XL.', 89.99, 129.99, 'ROPA', 'VIRAL', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500', 4.9, 678, 45),
('Conjunto Lino Premium','Conjunto de blusa y pantalón en lino natural, fresco, elegante y versátil.', 99.99, 149.99, 'ROPA', 'HOT', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=500', 4.8, 445, 38),
('Blazer Oversized Chic','Blazer oversized en 5 colores, corte moderno, perfecto para oficina o salida casual.', 119.99, 169.99, 'ROPA', 'BESTSELLER', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500', 4.7, 356, 30),
('Mini Falda Plisada Elegante','Mini falda plisada en satén, cintura elástica, disponible en 8 colores.', 69.99, 99.99, 'ROPA', 'NUEVO', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500', 4.6, 289, 55);

-- ─────────────────────────────────────────────
-- 8. Vistas útiles
-- ─────────────────────────────────────────────
CREATE VIEW v_sales_summary AS
SELECT 
    p.category,
    COUNT(oi.id)        AS total_orders,
    SUM(oi.quantity)    AS units_sold,
    SUM(oi.subtotal)    AS revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o   ON oi.order_id   = o.id
WHERE o.status NOT IN ('CANCELLED')
GROUP BY p.category;

CREATE VIEW v_top_products AS
SELECT p.*, 
       COALESCE(SUM(oi.quantity), 0) AS total_sold
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o       ON oi.order_id = o.id AND o.status NOT IN ('CANCELLED')
WHERE p.active = 1
GROUP BY p.id
ORDER BY total_sold DESC
LIMIT 10;

-- ─────────────────────────────────────────────
-- Fin del esquema LuxShop
-- ─────────────────────────────────────────────
