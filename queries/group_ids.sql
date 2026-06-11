-- Ids de grupo asignados a un cliente (membresía M2M, scope hub_id vía join al cliente).
-- Lo usa la ficha de cliente para preseleccionar grupos antes de set_groups (reemplazo).
SELECT cg.group_id AS id
FROM customers_customer_groups cg
JOIN customers_customer c ON c.id = cg.customer_id
WHERE cg.customer_id = :customer_id AND c.hub_id = :hub_id AND c.is_deleted = 0;
