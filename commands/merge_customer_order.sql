-- Step 11/15 of `customers.merge` (customers#86): the customer↔order junction (ADR-0141) moves to
-- the survivor, so `customers.orders.by_customer` keeps listing every order this person ever placed
-- under either sheet.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE customers_customer_order SET
  customer_id = :surviving_id, updated_by = :current_user_id, updated_at = :now
WHERE customer_id = :absorbed_id AND hub_id = :hub_id;
