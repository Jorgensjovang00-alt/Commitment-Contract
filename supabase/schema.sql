-- Combined Gym Commitment Contract System schema (idempotent)

-- 0) Prereqs
create extension if not exists pgcrypto;
create schema if not exists private;

-- 1) Tables
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('draft','active','succeeded','failed','cancelled','disputed')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  stake_amount_nok integer not null check (stake_amount_nok > 0),
  weeks integer not null check (weeks between 1 and 12),
  weekly_target integer not null check (weekly_target between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  stripe_payment_intent_id text unique,
  status text not null check (status in ('requires_action','authorized','captured','canceled')),
  method text check (method in ('card','apple_pay','vipps')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  occurred_at timestamptz not null,
  method text not null check (method in ('geofence','selfie','manual')),
  duration_min integer check (duration_min >= 0),
  location jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  accepted_terms_at timestamptz,
  accepted_privacy_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text check (platform in ('ios','android','web')),
  created_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','resolved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ore integer not null,
  reason text not null,
  ref_contract_id uuid references public.contracts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ore integer not null check (amount_ore > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- 2) Enable RLS
alter table public.contracts enable row level security;
alter table public.payments enable row level security;
alter table public.checkins enable row level security;
alter table public.profiles enable row level security;
alter table public.push_tokens enable row level security;
alter table public.disputes enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.payout_requests enable row level security;

-- 3) Drop existing policies (idempotent)
drop policy if exists "contracts select own" on public.contracts;
drop policy if exists "contracts insert own" on public.contracts;
drop policy if exists "contracts update own" on public.contracts;

drop policy if exists "payments select via contract" on public.payments;

drop policy if exists "checkins select via contract" on public.checkins;
drop policy if exists "checkins insert via contract" on public.checkins;

drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles upsert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

drop policy if exists "push select own" on public.push_tokens;
drop policy if exists "push insert own" on public.push_tokens;

drop policy if exists "disputes select own" on public.disputes;
drop policy if exists "disputes insert own" on public.disputes;
drop policy if exists "disputes update own open" on public.disputes;

drop policy if exists "wallet select own" on public.wallet_ledger;
drop policy if exists "wallet insert own credit" on public.wallet_ledger;

drop policy if exists "payout select own" on public.payout_requests;
drop policy if exists "payout insert own" on public.payout_requests;

-- 4) Policies
-- Contracts
create policy "contracts select own" on public.contracts
for select to authenticated
using (auth.uid() = user_id);

create policy "contracts insert own" on public.contracts
for insert to authenticated
with check (auth.uid() = user_id);

create policy "contracts update own" on public.contracts
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Payments (read-only; writes via service role)
create policy "payments select via contract" on public.payments
for select to authenticated
using (
  exists (
    select 1 from public.contracts c
    where c.id = public.payments.contract_id
      and c.user_id = auth.uid()
  )
);

-- Checkins (owner can read and insert)
create policy "checkins select via contract" on public.checkins
for select to authenticated
using (
  exists (
    select 1 from public.contracts c
    where c.id = public.checkins.contract_id
      and c.user_id = auth.uid()
  )
);

create policy "checkins insert via contract" on public.checkins
for insert to authenticated
with check (
  exists (
    select 1 from public.contracts c
    where c.id = public.checkins.contract_id
      and c.user_id = auth.uid()
  )
);

-- Profiles
create policy "profiles select own" on public.profiles
for select to authenticated
using (auth.uid() = user_id);

create policy "profiles upsert own" on public.profiles
for insert to authenticated
with check (auth.uid() = user_id);

create policy "profiles update own" on public.profiles
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Push tokens
create policy "push select own" on public.push_tokens
for select to authenticated
using (auth.uid() = user_id);

create policy "push insert own" on public.push_tokens
for insert to authenticated
with check (auth.uid() = user_id);

-- Disputes
create policy "disputes select own" on public.disputes
for select to authenticated
using (auth.uid() = user_id);

create policy "disputes insert own" on public.disputes
for insert to authenticated
with check (auth.uid() = user_id);

create policy "disputes update own open" on public.disputes
for update to authenticated
using (auth.uid() = user_id and status = 'open')
with check (auth.uid() = user_id);

-- Wallet ledger (view only for user; writes via service role)
create policy "wallet select own" on public.wallet_ledger
for select to authenticated
using (auth.uid() = user_id);

-- Payout requests
create policy "payout select own" on public.payout_requests
for select to authenticated
using (auth.uid() = user_id);

create policy "payout insert own" on public.payout_requests
for insert to authenticated
with check (auth.uid() = user_id);

-- 5) Indexes & constraints
create index if not exists idx_contracts_user on public.contracts(user_id);
create index if not exists idx_checkins_contract on public.checkins(contract_id, occurred_at desc);
create index if not exists idx_payments_contract on public.payments(contract_id);
create index if not exists idx_disputes_contract on public.disputes(contract_id);
create index if not exists idx_wallet_user on public.wallet_ledger(user_id);
create index if not exists idx_payout_user on public.payout_requests(user_id);

create unique index if not exists uniq_active_contract_per_user on public.contracts(user_id)
  where status = 'active';

-- 6) Triggers
create or replace function public.check_checkin_window() returns trigger as $$
begin
  if not exists(
    select 1 from public.contracts c
    where c.id = new.contract_id
      and new.occurred_at between c.start_at and c.end_at
  ) then
    raise exception 'Check-in outside contract window';
  end if;
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_checkin_window on public.checkins;
create trigger trg_checkin_window before insert on public.checkins
for each row execute function public.check_checkin_window();

create or replace function public.rate_limit_checkins() returns trigger as $$
begin
  if exists(
    select 1 from public.checkins ci
    where ci.contract_id = new.contract_id
      and ci.occurred_at > (now() - interval '2 hours')
  ) then
    raise exception 'Too many check-ins in short time';
  end if;
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_rate_limit_checkins on public.checkins;
create trigger trg_rate_limit_checkins before insert on public.checkins
for each row execute function public.rate_limit_checkins();

create or replace function public.ensure_single_open_dispute() returns trigger as $$
begin
  if exists(select 1 from public.disputes d where d.contract_id = new.contract_id and d.status = 'open') then
    raise exception 'There is already an open dispute for this contract';
  end if;
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_single_open_dispute on public.disputes;
create trigger trg_single_open_dispute before insert on public.disputes
for each row execute function public.ensure_single_open_dispute();
-- Users are managed by Supabase Auth; reference auth.users via user_id UUID

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('draft','active','succeeded','failed','cancelled')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  stake_amount_nok integer not null check (stake_amount_nok > 0),
  weeks integer not null check (weeks between 1 and 12),
  weekly_target integer not null check (weekly_target between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  stripe_payment_intent_id text unique,
  status text not null check (status in ('requires_action','authorized','captured','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  occurred_at timestamptz not null,
  method text not null check (method in ('geofence','selfie','manual')),
  duration_min integer check (duration_min >= 0),
  location jsonb,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.contracts enable row level security;
alter table public.payments enable row level security;
alter table public.checkins enable row level security;

create policy "contracts select own" on public.contracts for select using (auth.uid() = user_id);
create policy "contracts insert own" on public.contracts for insert with check (auth.uid() = user_id);
create policy "contracts update own" on public.contracts for update using (auth.uid() = user_id);

drop policy if exists "payments select via contract" on public.payments;
-- No insert/update policies for anon; Edge Functions (service role) perform writes
create policy "payments select via contract"
on public.payments
for select to authenticated
using (
  exists (
    select 1 from public.contracts c
    where c.id = public.payments.contract_id
      and c.user_id = auth.uid()
  )
);

create policy "checkins select via contract" on public.checkins for select using (
  exists(select 1 from public.contracts c where c.id = contract_id and c.user_id = auth.uid())
);
create policy "checkins insert via contract" on public.checkins for insert with check (
  exists(select 1 from public.contracts c where c.id = contract_id and c.user_id = auth.uid())
);

-- Helpful indexes
create index if not exists idx_contracts_user on public.contracts(user_id);
create index if not exists idx_checkins_contract on public.checkins(contract_id, occurred_at desc);
create index if not exists idx_payments_contract on public.payments(contract_id);
-- PROFILES: consent flags and roles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  accepted_terms_at timestamptz,
  accepted_privacy_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles upsert own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = user_id);

-- PUSH TOKENS
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text check (platform in ('ios','android','web')),
  created_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy "push select own" on public.push_tokens for select using (auth.uid() = user_id);
create policy "push insert own" on public.push_tokens for insert with check (auth.uid() = user_id);

-- CONSTRAINTS & INDEXES
create unique index if not exists uniq_active_contract_per_user on public.contracts(user_id)
  where status = 'active';

-- TRIGGERS: block checkins outside contract window and rate-limit
create or replace function public.check_checkin_window() returns trigger as $$
begin
  if not exists(select 1 from public.contracts c where c.id = new.contract_id and new.occurred_at between c.start_at and c.end_at) then
    raise exception 'Check-in outside contract window';
  end if;
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_checkin_window on public.checkins;
create trigger trg_checkin_window before insert on public.checkins
for each row execute function public.check_checkin_window();

create or replace function public.rate_limit_checkins() returns trigger as $$
begin
  if exists(
    select 1 from public.checkins ci
    where ci.contract_id = new.contract_id
      and ci.occurred_at > (now() - interval '2 hours')
  ) then
    raise exception 'Too many check-ins in short time';
  end if;
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_rate_limit_checkins on public.checkins;
create trigger trg_rate_limit_checkins before insert on public.checkins
for each row execute function public.rate_limit_checkins();

-- PAYMENTS: tighten policies (service role only for writes)
-- Remove insert/update policies if previously added (safe to ignore errors)
drop policy if exists "payments insert via contract" on public.payments;
drop policy if exists "payments update via contract" on public.payments;
create policy "payments select via contract" on public.payments for select using (
  exists(select 1 from public.contracts c where c.id = contract_id and c.user_id = auth.uid())
);
-- No insert/update policies for anon; Edge Functions (service key) perform writes
-- Extend contracts status to include disputed
alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts add constraint contracts_status_check check (status in ('draft','active','succeeded','failed','cancelled','disputed'));

-- Disputes table
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','resolved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.disputes enable row level security;
create index if not exists idx_disputes_contract on public.disputes(contract_id);

create policy "disputes select own" on public.disputes for select using (auth.uid() = user_id);
create policy "disputes insert own" on public.disputes for insert with check (auth.uid() = user_id);
create policy "disputes update own open" on public.disputes for update using (auth.uid() = user_id and status = 'open');

-- Ensure only one open dispute per contract
create or replace function public.ensure_single_open_dispute() returns trigger as $$
begin
  if exists(select 1 from public.disputes d where d.contract_id = new.contract_id and d.status = 'open') then
    raise exception 'There is already an open dispute for this contract';
  end if;
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_single_open_dispute on public.disputes;
create trigger trg_single_open_dispute before insert on public.disputes
for each row execute function public.ensure_single_open_dispute();
-- Payments: add method
alter table public.payments add column if not exists method text check (method in ('card','apple_pay','vipps'));

-- Wallet ledger (amount in NOK øre as integer)
create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ore integer not null,
  reason text not null,
  ref_contract_id uuid references public.contracts(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.wallet_ledger enable row level security;
create index if not exists idx_wallet_user on public.wallet_ledger(user_id);
create policy "wallet select own" on public.wallet_ledger for select using (auth.uid() = user_id);
create policy "wallet insert own credit" on public.wallet_ledger for insert with check (auth.uid() = user_id and amount_ore >= 0);
-- debits will be inserted by service role on payouts

-- Payout requests
create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ore integer not null check (amount_ore > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.payout_requests enable row level security;
create index if not exists idx_payout_user on public.payout_requests(user_id);
create policy "payout select own" on public.payout_requests for select using (auth.uid() = user_id);
create policy "payout insert own" on public.payout_requests for insert with check (auth.uid() = user_id);
-- updates by admin/service role only
);