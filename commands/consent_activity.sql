-- Step 3/3 of both consent commands (customers#10): the timeline entry.
--
-- The customer sheet reads ONLY `customers.activities`, so a consent decision that does not land
-- here is invisible where people actually look — the same hole `customers.notes.add` had until
-- customers#14. And the timeline is where somebody notices «this was granted at the counter three
-- minutes after they said no on the phone».
--
-- Written from the LEDGER ROW this command just inserted (`l.id = :new_id`), so a no-op grant —
-- another hub's customer, a deleted one — writes nothing here either: the two statements cannot
-- disagree about whether anything happened.
--
-- `activity_type` is `consent_granted` / `consent_withdrawn`, read off the row's own state, so
-- there is one file instead of two that can drift. The metadata carries the axes; the description
-- carries the words the person was shown (a grant) or the reason given (a withdrawal), which is
-- what a human reading the timeline needs and what an inspection asks for.
-- `title` is a KEY (`activity.consent_granted` / `activity.consent_withdrawn`), never a sentence:
-- the words are the catalogue's (customers#50). The DESCRIPTION is different and stays verbatim —
-- it is the notice the person was shown, and that is evidence, not UI text (EDPB 05/2020 §108).
-- Runtime injects :new_id, :hub_id, :current_user_id, :now.
INSERT INTO customers_customeractivity
  (id, hub_id, customer_id, activity_type, title, description, extra_metadata,
   related_object_id, related_object_type, performed_by,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, l.hub_id, l.customer_id,
       'consent_' || l.state,
       CASE WHEN l.state = 'granted' THEN 'activity.consent_granted' ELSE 'activity.consent_withdrawn' END,
       CASE WHEN l.state = 'granted' THEN l.notice_text ELSE l.reason END,
       '{"purpose": "' || l.purpose || '", "channel": "' || l.channel || '", '
       || '"source": "' || l.source || '", "notice_version": "' || l.notice_version || '", '
       || '"occurred_at": "' || l.occurred_at || '"}',
       l.id, 'consent', :current_user_id,
       0, :current_user_id, :current_user_id, :now, :now
FROM customers_consent_ledger l
WHERE l.id = :new_id AND l.hub_id = :hub_id;
