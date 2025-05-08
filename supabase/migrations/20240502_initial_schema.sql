-- Drop existing tables if they exist
drop table if exists ergebnisse cascade;
drop table if exists klassenstufe_spiele cascade;
drop table if exists kinder cascade;
drop table if exists spiele cascade;
drop table if exists spielgruppen cascade;
drop table if exists klassenstufen cascade;

-- Drop existing types if they exist
drop type if exists geschlecht_enum cascade;
drop type if exists wertungstyp_enum cascade;

-- Create enum types for consistent values
create type geschlecht_enum as enum ('Junge', 'Mädchen');
create type wertungstyp_enum as enum (
  'WEITE_MAX_AUS_N',      -- Gummistiefel: Bester aus N Versuchen
  'MENGE_MAX_ZEIT',       -- Wäsche/Bälle: Maximale Menge in Zeitlimit
  'ZEIT_MIN_STRAFE',      -- Schubkarre: Zeit + mögliche Strafe
  'PUNKTE_SUMME_AUS_N',   -- Figurenwerfen: Summe aus N Versuchen
  'PUNKTE_ABZUG',         -- Heißer Draht: Start - Abzüge
  'PUNKTE_MAX_EINZEL'     -- Glücksrad: Summe der Punkte
);

-- Create tables
create table klassenstufen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  reihenfolge integer not null unique,
  created_at timestamptz not null default now()
);

create table spielgruppen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  klassenstufe_id uuid not null references klassenstufen(id) on delete restrict,
  leiter_zugangscode text not null,
  created_at timestamptz not null default now()
);

create table kinder (
  id uuid primary key default gen_random_uuid(),
  vorname text not null,
  nachname text not null,
  geschlecht geschlecht_enum not null,
  spielgruppe_id uuid not null references spielgruppen(id) on delete restrict,
  created_at timestamptz not null default now(),
  -- Ensure unique name within a group
  unique(vorname, nachname, spielgruppe_id)
);

create table spiele (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  beschreibung text,
  wertungstyp wertungstyp_enum not null,
  anzahl_versuche integer,
  zeitlimit_sekunden integer,
  startpunkte integer,
  strafzeit_sekunden integer,
  einheit text,
  created_at timestamptz not null default now()
);

create table klassenstufe_spiele (
  klassenstufe_id uuid not null references klassenstufen(id) on delete restrict,
  spiel_id uuid not null references spiele(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (klassenstufe_id, spiel_id)
);

create table ergebnisse (
  id uuid primary key default gen_random_uuid(),
  kind_id uuid not null references kinder(id) on delete restrict,
  spiel_id uuid not null references spiele(id) on delete restrict,
  spielgruppe_id uuid not null references spielgruppen(id) on delete restrict,
  wert_numeric numeric not null,
  erfasst_am timestamptz not null default now(),
  -- Ein Kind kann pro Spiel nur ein Ergebnis haben
  unique(kind_id, spiel_id)
);

-- Create indexes for better query performance
create index idx_spielgruppen_klassenstufe on spielgruppen(klassenstufe_id);
create index idx_kinder_spielgruppe on kinder(spielgruppe_id);
create index idx_ergebnisse_kind on ergebnisse(kind_id);
create index idx_ergebnisse_spiel on ergebnisse(spiel_id);
create index idx_ergebnisse_spielgruppe on ergebnisse(spielgruppe_id);

-- Enable Row Level Security (RLS)
alter table klassenstufen enable row level security;
alter table spielgruppen enable row level security;
alter table kinder enable row level security;
alter table spiele enable row level security;
alter table klassenstufe_spiele enable row level security;
alter table ergebnisse enable row level security;

-- Create policies
-- Admins (authenticated via Supabase Auth) can do everything
create policy "Admins have full access to klassenstufen"
  on klassenstufen for all
  using (auth.role() = 'authenticated');

create policy "Admins have full access to spielgruppen"
  on spielgruppen for all
  using (auth.role() = 'authenticated');

create policy "Admins have full access to kinder"
  on kinder for all
  using (auth.role() = 'authenticated');

create policy "Admins have full access to spiele"
  on spiele for all
  using (auth.role() = 'authenticated');

create policy "Admins have full access to klassenstufe_spiele"
  on klassenstufe_spiele for all
  using (auth.role() = 'authenticated');

create policy "Admins have full access to ergebnisse"
  on ergebnisse for all
  using (auth.role() = 'authenticated');
