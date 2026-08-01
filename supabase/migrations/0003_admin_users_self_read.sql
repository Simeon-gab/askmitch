-- Erratum fix for docs/DATABASE.md: admin_users has RLS enabled with zero
-- policies, but the admin read policies on leads/email_log check membership
-- via a subquery on admin_users — which RLS hides from the authenticated
-- user, so those policies could never pass. Minimal fix: each signed-in
-- user may read exactly their own mapping row. No writes are granted.
create policy admin_users_self_read on admin_users for select to authenticated
  using (user_id = auth.uid());
