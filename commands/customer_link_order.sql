-- ADR-0141: enlaza un cliente con un pedido abierto (junction). Idempotente por pedido: un pedido
-- tiene como mucho UN cliente, así que re-asignar sustituye en vez de duplicar.
DELETE FROM customers_customer_order
 WHERE hub_id = :hub_id AND order_id = :order_id;
