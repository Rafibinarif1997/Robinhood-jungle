-- ETH JUNGLE initial Supabase schema
-- Run in Supabase Dashboard > SQL Editor.
-- This schema is for the prototype stage. Hidden answers and winner selection
-- must be handled only by trusted backend functions, never directly by the browser.

create extension if not exists pgcrypto;

create table if not exists public.hunts (
  id uuid primary key default gen_random_uuid(),
  round_id bigint generated always as identity unique,
  status text not null default 'draft'
    check (status in ('draft','scheduled','live','won','expired','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  map_version text not null default 'jungle-v1',
  -- Store only a non-reversible, properly keyed commitment here.
  -- Do not put plaintext answers or private coordinates in this table.
  answer_commitment text,
  winner_wallet text,
  winner_submission_id uuid,
  prize_wei numeric(78,0) not null default 10000000000000000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint positive_prize check (prize_wei >= 0)
);

create table if not exists public.clues (
  id uuid primary key default gen_random_uuid(),
  hunt_id uuid not null references public.hunts(id) on delete cascade,
  clue_order integer not null check (clue_order > 0),
  public_text text not null,
  unlock_at timestamptz,
  created_at timestamptz not null default now(),
  unique (hunt_id, clue_order)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  hunt_id uuid not null references public.hunts(id) on delete cascade,
  wallet text not null,
  answer_commitment text not null,
  result text not null default 'pending'
    check (result in ('pending','incorrect','accepted','rejected','rate_limited')),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists submissions_hunt_created_idx
  on public.submissions (hunt_id, created_at);

create index if not exists submissions_hunt_wallet_created_idx
  on public.submissions (hunt_id, lower(wallet), created_at);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  hunt_id uuid not null unique references public.hunts(id),
  winner_wallet text not null,
  amount_wei numeric(78,0) not null check (amount_wei >= 0),
  tx_hash text unique,
  status text not null default 'pending'
    check (status in ('pending','submitted','confirmed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  hunt_id uuid references public.hunts(id) on delete set null,
  event_type text not null,
  actor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Public read access is limited to published hunt metadata and public clues.
alter table public.hunts enable row level security;
alter table public.clues enable row level security;
alter table public.submissions enable row level security;
alter table public.payouts enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "Public can read live hunt metadata" on public.hunts;
create policy "Public can read live hunt metadata"
  on public.hunts for select
  to anon, authenticated
  using (status in ('scheduled','live','won','expired'));

drop policy if exists "Public can read clues for visible hunts" on public.clues;
create policy "Public can read clues for visible hunts"
  on public.clues for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.hunts h
      where h.id = clues.hunt_id
        and h.status in ('scheduled','live','won','expired')
    )
    and (unlock_at is null or unlock_at <= now())
  );

drop policy if exists "Public can read confirmed payouts" on public.payouts;
create policy "Public can read confirmed payouts"
  on public.payouts for select
  to anon, authenticated
  using (status = 'confirmed');

-- Intentionally no client-side INSERT/UPDATE/DELETE policies for submissions,
-- winner fields, payouts, audit events or hunts. Trusted server-side functions
-- using a service role / database function must enforce validation and rate limits.
-- Never expose the Supabase service_role key in Vite variables or browser code.
