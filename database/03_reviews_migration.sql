-- ============================================================
--  KOSMICA — Migration: Mejorar tabla reviews
--  Ejecutar UNA VEZ sobre la BD existente
--  La tabla reviews ya existe en luxshop_database.sql
-- ============================================================

USE luxshop;

-- Agregar columna para foto de la reseña (opcional, puede ser NULL)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500) DEFAULT NULL AFTER comment,
  ADD COLUMN IF NOT EXISTS approved  TINYINT(1) DEFAULT 1 AFTER verified;

-- Índice para filtrar aprobadas eficientemente
ALTER TABLE reviews
  ADD INDEX IF NOT EXISTS idx_review_approved (product_id, approved);

-- ── Reseñas de muestra para ver la funcionalidad de inmediato ──
-- Puedes eliminar este bloque si no quieres datos de prueba

INSERT INTO reviews (product_id, user_name, user_email, rating, comment, verified, approved) VALUES
-- Bolso Chanel (id=1)
(1, 'Valentina R.', 'vr@ejemplo.com', 5,
 '¡Increíble calidad! El bolso llegó en perfectas condiciones, exactamente como en las fotos. La cadena dorada es preciosa y el cuero sintético se siente premium. Ya lo he llevado dos veces y recibo mil piropos 💜', 1, 1),
(1, 'Camila T.', 'ct@ejemplo.com', 5,
 'Superó mis expectativas. El empaque fue muy cuidadoso y el envío llegó súper rápido. Definitivamente mi bolso favorito ahora.', 1, 1),
(1, 'Isabella M.', null, 4,
 'Muy bonito, la calidad es buena para el precio. Le doy 4 porque el interior podría tener más bolsillos, pero en general estoy feliz con mi compra.', 0, 1),

-- Paleta Glam (id=9)
(9, 'Mariana L.', 'ml@ejemplo.com', 5,
 '¡La pigmentación es INCREÍBLE! Los tonos brillantes duran todo el día sin crease. Ya tengo ganas de pedir otra paleta 🎨', 1, 1),
(9, 'Sofia P.', null, 4,
 'Muy buena paleta, los colores son bonitos y variados. Los mattes son más opacos pero con un buen base quedan perfectos.', 0, 1),

-- Aceite Argan (id=13)
(13, 'Laura G.', 'lg@ejemplo.com', 5,
 'Llevo 3 semanas usándolo y mi cabello está irreconocible de brillante y suave. Lo recomiendo 100% a todas mis amigas.', 1, 1),

-- Vestido Maxi Floral (id=17)
(17, 'Andrea F.', null, 5,
 'El vestido es precioso y la tela es muy fresca, ideal para este calor. La talla M me quedó perfecta. Ya hice mi segunda compra en Kosmica ✨', 0, 1),
(17, 'Carolina B.', 'cb@ejemplo.com', 4,
 'Muy lindo el vestido, los colores son exactamente como en la foto. Tardó 3 días en llegar, muy bien empacado.', 1, 1);
