-- ============================================================================
-- MIG Assessment — Supabase schema
-- Run this in Supabase SQL editor on a fresh project.
-- ============================================================================

-- Drop existing (only for clean re-installs in dev)
-- drop table if exists answers cascade;
-- drop table if exists attempts cascade;
-- drop table if exists admins cascade;

-- ============================================================================
-- TABLES
-- ============================================================================

create table if not exists attempts (
  id              uuid primary key default gen_random_uuid(),
  candidate_name  text not null,
  candidate_email text not null,
  lang            text not null check (lang in ('en','ru','uz')),
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  auto_score      numeric,
  manual_score    numeric,
  status          text not null default 'in_progress'
                  check (status in ('in_progress','submitted','graded')),
  question_order  jsonb not null default '[]'::jsonb,
  -- IP / UA captured for audit
  ip              text,
  user_agent      text
);

create index if not exists attempts_email_idx on attempts (candidate_email);
create index if not exists attempts_status_idx on attempts (status);
create index if not exists attempts_submitted_idx on attempts (submitted_at desc);

create table if not exists answers (
  id              uuid primary key default gen_random_uuid(),
  attempt_id      uuid not null references attempts(id) on delete cascade,
  question_id     text not null,
  question_type   text not null check (question_type in ('mcq_single','mcq_multi','open')),
  response        jsonb not null,           -- array of letters OR string
  auto_points     numeric,
  manual_points   numeric,
  ai_feedback     text,
  admin_comment   text,
  unique (attempt_id, question_id)
);

create index if not exists answers_attempt_idx on answers (attempt_id);

-- Admins table — stores which Supabase Auth users have admin rights.
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email   text not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Strategy:
--   * Public/anonymous users (candidates) can INSERT attempts and answers,
--     and UPDATE their own in-progress attempt by id.
--   * SELECT on attempts/answers is restricted to admins only.
--   * The Cloudflare Pages Function uses the SERVICE ROLE key to bypass RLS
--     for grading and admin reads (server-side only).
--
-- The candidate gets an attempt id back on creation; the client uses that id
-- as a "ticket" to write answers. Reads of others' attempts are blocked.

alter table attempts enable row level security;
alter table answers  enable row level security;
alter table admins   enable row level security;

-- Anonymous users can create a new attempt
drop policy if exists "anon insert attempt" on attempts;
create policy "anon insert attempt"
  on attempts for insert
  to anon, authenticated
  with check (true);

-- Anonymous users can update their own attempt while in_progress
-- (we accept that knowing the id == owning the attempt; the id is a UUID)
drop policy if exists "anon update own attempt" on attempts;
create policy "anon update own attempt"
  on attempts for update
  to anon, authenticated
  using (status = 'in_progress')
  with check (true);

-- Anonymous users CANNOT read attempts at all (privacy)
drop policy if exists "admin select attempts" on attempts;
create policy "admin select attempts"
  on attempts for select
  to authenticated
  using (exists (select 1 from admins where admins.user_id = auth.uid()));

-- Admins can update attempts (for grading)
drop policy if exists "admin update attempts" on attempts;
create policy "admin update attempts"
  on attempts for update
  to authenticated
  using (exists (select 1 from admins where admins.user_id = auth.uid()))
  with check (exists (select 1 from admins where admins.user_id = auth.uid()));

-- Anonymous users can insert their own answers
drop policy if exists "anon insert answer" on answers;
create policy "anon insert answer"
  on answers for insert
  to anon, authenticated
  with check (true);

-- Anonymous users can update their answers while attempt is in_progress
drop policy if exists "anon update answer" on answers;
create policy "anon update answer"
  on answers for update
  to anon, authenticated
  using (
    exists (
      select 1 from attempts
      where attempts.id = answers.attempt_id and attempts.status = 'in_progress'
    )
  )
  with check (true);

-- Only admins can read answers
drop policy if exists "admin select answers" on answers;
create policy "admin select answers"
  on answers for select
  to authenticated
  using (exists (select 1 from admins where admins.user_id = auth.uid()));

-- Admins can update answers (manual grading)
drop policy if exists "admin update answers" on answers;
create policy "admin update answers"
  on answers for update
  to authenticated
  using (exists (select 1 from admins where admins.user_id = auth.uid()))
  with check (exists (select 1 from admins where admins.user_id = auth.uid()));

-- Admins can read the admins table (to verify themselves)
drop policy if exists "admin self read" on admins;
create policy "admin self read"
  on admins for select
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- BOOTSTRAP YOUR FIRST ADMIN
-- ============================================================================
-- 1. In Supabase Auth, create a user (e.g. mamur@mosaic.uz) with a password.
-- 2. Run the following with that user's id:
--
--    insert into admins (user_id, email)
--      values ('<paste-user-id-from-auth.users>', 'mamur@mosaic.uz');
--
-- ============================================================================
