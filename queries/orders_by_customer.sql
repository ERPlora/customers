-- ADR-0141: pedidos de un cliente (lectura cruzada). `customers` guarda SOLO el FK; los importes
-- se piden a `sales` con una query declarada (sales.orders.list filtrada por estos ids, ADR-0127):
-- el dinero tiene una sola fuente de verdad y no se duplica aquí.
SELECT order_id, customer_id, created_at
FROM customers_customer_order
WHERE customer_id = :customer_id AND hub_id = :hub_id AND is_deleted = 0
ORDER BY created_at DESC;
