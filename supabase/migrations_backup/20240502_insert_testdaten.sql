-- Erst Spielgruppen für jede Klassenstufe anlegen
insert into spielgruppen (name, klassenstufe_id, leiter_zugangscode)
select 
  k.name || case 
    when sub.gruppe = 1 then 'A'
    when sub.gruppe = 2 then 'B'
    else 'C'
  end as name,
  k.id as klassenstufe_id,
  'test' || k.name || case 
    when sub.gruppe = 1 then 'A'
    when sub.gruppe = 2 then 'B'
    else 'C'
  end as leiter_zugangscode
from klassenstufen k
cross join (select generate_series(1, 2) as gruppe) sub;  -- 2 Gruppen pro Klassenstufe

-- Jetzt generieren wir 100 Kinder und verteilen sie auf die Spielgruppen
with spielgruppen_list as (
  select id, name, 
         row_number() over (order by name) as gruppe_nr 
  from spielgruppen
),
nummern as (
  select generate_series as nr from generate_series(1, 100)
),
zufallskinder as (
  select 
    n.nr,
    case 
      when (n.nr % 2) = 0 then 'Junge' 
      else 'Mädchen' 
    end as geschlecht,
    case 
      when (n.nr % 2) = 0 then 
        'Kind-' || n.nr || '-J'
      else
        'Kind-' || n.nr || '-M'
    end as vorname,
    'Familie-' || (n.nr / 4)::int as nachname,
    -- Verteile die Kinder gleichmäßig auf die Spielgruppen
    (select id 
     from spielgruppen_list 
     where gruppe_nr = (((n.nr - 1) % (select count(*) from spielgruppen_list)) + 1)
    ) as spielgruppe_id
  from nummern n
)
insert into kinder (vorname, nachname, geschlecht, spielgruppe_id)
select 
  z.vorname,
  z.nachname,
  z.geschlecht::geschlecht_enum,
  z.spielgruppe_id
from zufallskinder z;
