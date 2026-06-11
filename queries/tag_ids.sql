-- Ids de etiqueta asignados a un cliente (membresía M2M, scope hub_id vía join al cliente).
-- Lo usa la ficha de cliente para preseleccionar etiquetas antes de set_tags (reemplazo).
SELECT ct.tag_id AS id
FROM customers_customer_tags ct
JOIN customers_customer c ON c.id = ct.customer_id
WHERE ct.customer_id = :customer_id AND c.hub_id = :hub_id AND c.is_deleted = 0;
