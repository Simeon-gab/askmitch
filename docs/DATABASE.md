# DATABASE.md

Supabase Postgres. All tables carry `org_id` from day one (multi-tenant-ready; v1 uses a single org row for ASKMITCH).

## Schema

```sql
-- Organizations (one row for v1: ASKMITCH Multiventures)
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,               -- 'askmitch'
  created_at timestamptz not null default now()
);

-- Leads (the core table)
create table leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  name text not null,
  email text not null,
  phone text,                              -- raw as entered; normalized copy below
  phone_e164 text,                         -- +234... when derivable, else null
  -- gadget interest is MULTI-select since 2026-08-04 (migration 0002).
  -- `gadgets` is the source of truth; legacy `gadget` (= gadgets[1]) is
  -- still written for rollout safety and drops in a post-event cleanup.
  gadget text not null check (gadget in ('iphone','samsung','laptop','audio','watch','gaming','other')),
  gadgets text[] check (gadgets is null or (array_length(gadgets, 1) >= 1
    and gadgets <@ array['iphone','samsung','laptop','audio','watch','gaming','other']::text[])),
  gadget_other text,                       -- free text when gadgets includes 'other'
  move text not null check (move in ('buy','sell','swap','browsing')),
  timing text not null check (timing in ('today','this_week','this_month','someday')),
  consent boolean not null default false,
  source text not null default 'link' check (source in ('qr','kiosk','link')),
  voucher_code text not null,
  expires_at timestamptz not null,
  redeemed_at timestamptz,                 -- null = unredeemed
  created_at timestamptz not null default now(),
  unique (org_id, email),
  unique (org_id, voucher_code)
);

-- Email delivery log
create table email_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  lead_id uuid not null references leads(id),
  kind text not null default 'voucher',
  status text not null check (status in ('sent','failed')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

-- Rate limiting (per-IP sliding window for /api/register)
create table rate_limits (
  key text primary key,                    -- 'register:<ip>'
  count int not null default 1,
  window_start timestamptz not null default now()
);
```

## Normalization rules (enforced in API layer)

- `email`: `lower(trim(email))` before upsert.
- `phone_e164`: if input matches Nigerian mobile pattern (`0[789][01]xxxxxxxx`), convert to `+234` form; else leave null and keep raw in `phone`.
- `voucher_code`: server-generated, `'MITCH-' || 5 chars` from alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I). On unique-violation retry, regenerate (loop max 5, then 500).

## Indexes

```sql
create index leads_org_created_idx on leads (org_id, created_at desc);
create index leads_org_gadget_idx on leads (org_id, gadget);
create index leads_org_gadgets_idx on leads using gin (gadgets);  -- migration 0002
create index leads_org_timing_idx on leads (org_id, timing);
create index leads_org_move_idx on leads (org_id, move);
create index leads_voucher_lookup_idx on leads (org_id, upper(voucher_code));
create index email_log_lead_idx on email_log (lead_id);
```

Redemption lookup must be case-insensitive: query with `upper(voucher_code) = upper($1)` (matches the expression index).

## RLS

RLS ON for every table. Deny-by-default posture:

```sql
alter table orgs enable row level security;
alter table leads enable row level security;
alter table email_log enable row level security;
alter table rate_limits enable row level security;
```

- **anon role: zero policies.** The public registration form never touches the DB directly — everything goes through API routes using the service role. This is deliberate: it keeps voucher generation, dedupe, and rate limiting server-authoritative.
- **authenticated role (admin)**: read-only SELECT policies on `leads` and `email_log` scoped to org membership. v1 shortcut: a single `admin_users (user_id uuid, org_id uuid)` mapping table; policy `exists (select 1 from admin_users au where au.user_id = auth.uid() and au.org_id = leads.org_id)`.
- **service_role**: bypasses RLS (Supabase default). Used only in API routes; key server-side only.

```sql
create table admin_users (
  user_id uuid primary key,
  org_id uuid not null references orgs(id)
);
alter table admin_users enable row level security;

create policy admin_read_leads on leads for select to authenticated
  using (exists (select 1 from admin_users au where au.user_id = auth.uid() and au.org_id = leads.org_id));

create policy admin_read_email_log on email_log for select to authenticated
  using (exists (select 1 from admin_users au where au.user_id = auth.uid() and au.org_id = email_log.org_id));
```

No INSERT/UPDATE/DELETE policies for authenticated — all mutations via service role API routes only.

## Seed

```sql
insert into orgs (name, slug) values ('ASKMITCH Multiventures', 'askmitch');
-- create the owner auth user in Supabase dashboard, then:
insert into admin_users (user_id, org_id) values ('<owner-auth-uid>', '<askmitch-org-id>');
```

## Marketing segment queries (for reference / export presets)

```sql
-- Hot leads: at the counter today or this week, buying or swapping
select name, phone_e164, gadgets from leads
where org_id = $1 and timing in ('today','this_week') and move in ('buy','swap');

-- Unredeemed voucher reminder list (send day 10)
select name, email, voucher_code, expires_at from leads
where org_id = $1 and redeemed_at is null and consent = true and expires_at > now();

-- Interest segment for a category promo (matches any lead whose list
-- includes the category — the GIN index serves this)
select name, email from leads
where org_id = $1 and gadgets @> array[$2]::text[] and consent = true;

-- Sellers/swappers (inventory acquisition pipeline)
select name, phone_e164, gadgets from leads
where org_id = $1 and move in ('sell','swap');
```
