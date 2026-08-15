-- Une un cliente a una etiqueta, resolviendo LOS DOS padres contra el hub inyectado (pm#146).
--
-- La tabla de unión NO tiene `hub_id`: no hay columna donde el aislamiento pueda apoyarse, así que
-- tiene que venir de los padres. Un `VALUES (:customer_id, :tag_id)` aceptaba ids de cualquier hub
-- y dejaba la fila cruzada escrita para siempre — acotar el JOIN de lectura (pm#89) deja de verla,
-- no impide que exista.
--
-- `INSERT … SELECT` con las dos guardas: si cualquiera de los padres no es de este hub (o está
-- borrado) no se selecciona nada, no se escribe nada, y `expect_rows` convierte ese silencio en un
-- error de negocio en vez de un OK mentiroso.
INSERT INTO customers_customer_tags (customer_id, tag_id)
SELECT c.id, t.id
FROM customers_customer c
JOIN customers_customertag t
  ON t.hub_id = c.hub_id AND t.id = :tag_id AND t.hub_id = :hub_id AND t.is_deleted = 0
WHERE c.id = :customer_id AND c.hub_id = :hub_id AND c.is_deleted = 0
ON CONFLICT (customer_id, tag_id) DO NOTHING;
