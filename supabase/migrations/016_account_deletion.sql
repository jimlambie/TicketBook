-- ============================================================
-- TicketBook – Migration 016: account deletion
-- ============================================================
-- Accounts are deleted by the delete-account Edge Function via
-- auth.admin.deleteUser(), which cascades from auth.users to
-- public.users and everything that references it.
--
-- reports.resolved_by had no ON DELETE action, so deleting a user who
-- had resolved a report would fail. Keep the report, drop the link.

alter table public.reports
  drop constraint if exists reports_resolved_by_fkey;

alter table public.reports
  add constraint reports_resolved_by_fkey
  foreign key (resolved_by) references public.users(id) on delete set null;
