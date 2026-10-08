-- ADR-0141 / customers#135: the way back of the customer↔order junction — WHICH customer an order
-- has. The till's customer search reads it when `sales` restores a check (reload, retrieving a
-- parked check) and puts the customer back. At most one row: the junction is unique per
-- (hub_id, order_id) and re-linking replaces the row.
SELECT order_id, customer_id
FROM customers_customer_order
WHERE order_id = :order_id AND hub_id = :hub_id AND is_deleted = 0;
