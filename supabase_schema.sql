-- Tabelle für Events (Jahrgänge)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- z.B. "Vogelschießen 2025"
  jahr integer not null, -- z.B. 2025
  created_at timestamp with time zone default now()
);

-- Tabelle für Kinder
create table if not exists kinder (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  vorname text not null,
  nachname text not null,
  geschlecht text check (geschlecht in ('Junge', 'Mädchen')) not null,
  klasse text not null, -- z.B. "1a", "Schulis"
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Änderungsprotokoll für Kinder
create table if not exists kinder_log (
  id uuid primary key default gen_random_uuid(),
  kind_id uuid references kinder(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  aktion text not null, -- z.B. "import", "update", "delete"
  altwerte jsonb, -- Vorherige Werte
  neuwert jsonb, -- Neue Werte
  user_email text, -- Wer hat geändert
  timestamp timestamp with time zone default now()
);
