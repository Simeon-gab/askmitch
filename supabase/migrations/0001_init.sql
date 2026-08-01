-- ASKMITCH opening-day lead capture — initial schema.
-- Source of truth: docs/DATABASE.md. Applied to Supabase project `askmitch`.

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
  gadget text not null check (gadget in ('iphone','samsung','laptop','audio','watch','gaming','other')),
  gadget_other text,                       -- free text when gadget = 'other'
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

-- Admin mapping (v1: single owner; row inserted manually after the owner
-- auth user is created in the Supabase dashboard — see docs/DATABASE.md Seed)
create table admin_users (
  user_id uuid primary key,
  org_id uuid not null references orgs(id)
);

-- Indexes
create index leads_org_created_idx on leads (org_id, created_at desc);
create index leads_org_gadget_idx on leads (org_id, gadget);
create index leads_org_timing_idx on leads (org_id, timing);
create index leads_org_move_idx on leads (org_id, move);
create index leads_voucher_lookup_idx on leads (org_id, upper(voucher_code));
create index email_log_lead_idx on email_log (lead_id);

-- RLS: ON for every table, deny-by-default.
-- anon role gets ZERO policies — the public form never touches the DB directly;
-- all writes go through API routes using the service role.
alter table orgs enable row level security;
alter table leads enable row level security;
alter table email_log enable row level security;
alter table rate_limits enable row level security;
alter table admin_users enable row level security;

-- authenticated (admin) role: read-only, scoped to org membership.
create policy admin_read_leads on leads for select to authenticated
  using (exists (select 1 from admin_users au where au.user_id = auth.uid() and au.org_id = leads.org_id));

create policy admin_read_email_log on email_log for select to authenticated
  using (exists (select 1 from admin_users au where au.user_id = auth.uid() and au.org_id = email_log.org_id));

-- No INSERT/UPDATE/DELETE policies for authenticated — all mutations via
-- service-role API routes only.

-- Seed
insert into orgs (name, slug) values ('ASKMITCH Multiventures', 'askmitch');
-- After creating the owner auth user in the Supabase dashboard:
-- insert into admin_users (user_id, org_id) values ('<owner-auth-uid>', '<askmitch-org-id>');
