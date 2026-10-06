-- Step 9/9 of `customers.anonymize` (customers#121): the phone the card had before it became E.164.
--
-- `commands/_phones_to_e164.sql` kept the old text of every card it rewrote, so that the upgrade
-- could be undone. It is the customer's phone all the same: an erasure that left it there
-- would not be one. Deleted, not blanked — the row proves nothing once the person is gone, and the
-- card's own audit entry already says who erased what and when.
DELETE FROM customers_phone_backup
WHERE customer_id = :customer_id AND hub_id = :hub_id;
