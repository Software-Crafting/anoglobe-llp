-- Safe to run repeatedly: npm run db:migrate
create table if not exists leads (
  id bigint generated always as identity primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);
create index if not exists leads_created_at_idx on leads (created_at);
alter table leads add column if not exists is_demo boolean not null default false;

create sequence if not exists registration_ref start 10001;
create sequence if not exists payment_ref start 9001;
create sequence if not exists call_ref start 5001;

create table if not exists registrations (
  id bigint generated always as identity primary key,
  ref text not null unique default ('AG-' || nextval('registration_ref')),
  status text not null default 'draft' check (status in ('draft', 'pending', 'review', 'active', 'failed', 'paused', 'cancelled')),
  step text not null default 'business',
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  role text,
  business_name text,
  state text,
  plan text,
  plan_amount_cents int,
  catchup_months int,
  data jsonb not null default '{}',
  ein_enc text,
  terms_at timestamptz,
  terms_ip text,
  is_demo boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists registrations_email_idx on registrations (lower(email));
create index if not exists registrations_created_idx on registrations (created_at desc);

-- Browser cookie and emailed resume links; only hashes are stored.
create table if not exists registration_tokens (
  hash text primary key,
  registration_id bigint not null references registrations on delete cascade,
  expires_at timestamptz not null
);

create table if not exists documents (
  id bigint generated always as identity primary key,
  registration_id bigint not null references registrations on delete cascade,
  kind text not null check (kind in ('bank-statement', 'tax-return', 'chart-of-accounts')),
  filename text not null,
  mime text not null,
  size_bytes bigint not null,
  storage_key text not null,
  uploaded_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists documents_reg_idx on documents (registration_id);

create table if not exists payments (
  id bigint generated always as identity primary key,
  ref text not null unique default ('PAY-' || nextval('payment_ref')),
  registration_id bigint not null references registrations on delete cascade,
  kind text not null check (kind in ('recurring', 'one-time')),
  description text not null,
  amount_cents int not null,
  status text not null check (status in ('succeeded', 'failed', 'refunded', 'pending')),
  brand text,
  last4 text,
  exp text,
  gateway text not null,
  gateway_id text,
  failure_reason text,
  refund_cents int,
  refund_reason text,
  auth_text text,
  auth_by text,
  auth_at timestamptz,
  auth_ip text,
  created_at timestamptz not null default now()
);
create index if not exists payments_reg_idx on payments (registration_id);
create index if not exists payments_created_idx on payments (created_at desc);

create table if not exists subscriptions (
  id bigint generated always as identity primary key,
  registration_id bigint not null references registrations on delete cascade,
  plan text not null,
  amount_cents int not null,
  status text not null check (status in ('active', 'paused', 'failed', 'cancelled')),
  next_charge_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_reg_idx on subscriptions (registration_id);

create table if not exists emails (
  id bigint generated always as identity primary key,
  registration_id bigint references registrations on delete cascade,
  template text not null,
  to_email text not null,
  subject text not null,
  html text not null,
  status text not null check (status in ('delivered', 'not_sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists emails_created_idx on emails (created_at desc);

create table if not exists calls (
  id bigint generated always as identity primary key,
  ref text not null unique default ('CALL-' || nextval('call_ref')),
  registration_id bigint references registrations on delete cascade,
  trigger text not null,
  phone text not null,
  status text not null check (status in ('queued', 'ringing', 'answered', 'noanswer', 'failed')),
  duration_s int,
  provider_id text,
  summary text,
  sentiment text,
  next_step text,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists calls_created_idx on calls (created_at desc);

create table if not exists admin_users (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  title text,
  role text not null check (role in ('owner', 'admin', 'bookkeeper', 'viewer')),
  status text not null default 'invited' check (status in ('active', 'invited', 'disabled')),
  password_hash text,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  reset_hash text,
  reset_expires timestamptz,
  last_active_at timestamptz,
  notifications_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists admin_users_email_idx on admin_users (lower(email));

create table if not exists admin_sessions (
  hash text primary key,
  user_id bigint not null references admin_users on delete cascade,
  user_agent text,
  ip text,
  remember boolean not null default false,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id bigint generated always as identity primary key,
  registration_id bigint not null references registrations on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor text not null,
  registration_id bigint references registrations on delete cascade,
  event text not null,
  icon text not null default 'edit',
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on audit_log (created_at desc);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);
