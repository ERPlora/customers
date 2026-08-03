-- Resolver interno del core: solo devuelve los campos de entrega del cliente referenciado.
-- El módulo consumidor nunca ejecuta esta query ni recibe email/teléfono en su sandbox.
SELECT email, phone
FROM customers_customer
WHERE id = :customer_id
  AND hub_id = :hub_id
  AND is_active = 1
  AND is_deleted = 0
LIMIT 1;
