INSERT INTO customers_customer_order
  (id, hub_id, customer_id, order_id, is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :customer_id, :order_id, 0, :current_user_id, :current_user_id, :now, :now);
