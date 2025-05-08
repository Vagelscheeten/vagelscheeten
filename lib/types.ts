import { Database } from './database.types';

// Define custom types based on Supabase schema, potentially simplifying or adding fields

// Using Supabase generated types directly might be simpler if no customization is needed
// export type Kind = Database['public']['Tables']['kinder']['Row'];
// export type Spielgruppe = Database['public']['Tables']['spielgruppen']['Row'];
// export type KindZuordnung = Database['public']['Tables']['kind_spielgruppe_zuordnung']['Row'];

// Custom types (ensure they match the expected structure, including fields like created_at)
export type Kind = {
  id: string;
  created_at: string;
  vorname: string;
  nachname: string;
  geschlecht: 'Junge' | 'Mädchen';
  klasse: string; // Direkte Zuweisung zu einer Klasse (z.B. "1a", "2b", "Schulis")
  event_id: string | null;
};

export type Spielgruppe = {
  id: string;
  created_at: string; // Added from Supabase type
  name: string;
  klasse: string; // Replaced klasse_id
  leiter_zugangscode: string; // Added from Supabase type
  event_id: string | null; // Added from Supabase type
};

export type KindZuordnung = {
  id: string;
  created_at: string; // Added from Supabase type
  kind_id: string;
  spielgruppe_id: string;
  event_id: string; // Assuming this is required based on previous context
};

export type Event = Database['public']['Tables']['events']['Row'];

// Removed Klasse as it doesn't exist in DB types
// export type Klasse = {
//   id: string;
//   name: string; // e.g., "Klasse 1", "Klasse 2"
//   event_id: string;
// };

export type Spiel = Database['public']['Tables']['spiele']['Row'];

// Keine Klassenstufen-Typen mehr, da wir direkt mit 'klasse' als String arbeiten

// Typ für Helferaufgaben (wird für die Slots-Seite benötigt)
export type Aufgabe = {
  id: string; // UUID
  created_at?: string; // Optional, falls es von Supabase kommt
  titel: string; // Geändert von name
  beschreibung?: string; // Optional, bleibt bestehen für die textuelle Beschreibung
  // Mögliche weitere Felder, die relevant sein könnten:
  // event_id?: string | null;
  // bereich_id?: string | null; // Falls Aufgaben Bereichen zugeordnet sind
  // zeit?: string; // Z.B. "Vormittag", "Nachmittag"
  // ort?: string;
};

// Typ für Helfer (wird für die Slot-Zuweisung benötigt)
export type Helfer = {
  id: string; // UUID, normalerweise die User-ID aus Supabase Auth
  created_at?: string;
  vorname?: string | null;
  nachname?: string | null;
  email?: string | null; // Oder eine andere Form der Identifikation/Kontakt
  // Weitere helfer-spezifische Felder könnten hier stehen
};
