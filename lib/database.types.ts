export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ablauf_eintraege: {
        Row: {
          beschreibung: string | null
          created_at: string | null
          event_id: string | null
          farbe: string | null
          hinweis: string | null
          icon: string | null
          id: string
          ist_highlight: boolean | null
          sortierung: number
          titel: string
          uhrzeit: string
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string | null
          event_id?: string | null
          farbe?: string | null
          hinweis?: string | null
          icon?: string | null
          id?: string
          ist_highlight?: boolean | null
          sortierung?: number
          titel: string
          uhrzeit: string
        }
        Update: {
          beschreibung?: string | null
          created_at?: string | null
          event_id?: string | null
          farbe?: string | null
          hinweis?: string | null
          icon?: string | null
          id?: string
          ist_highlight?: boolean | null
          sortierung?: number
          titel?: string
          uhrzeit?: string
        }
        Relationships: [
          {
            foreignKeyName: "ablauf_eintraege_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      anmeldungen: {
        Row: {
          benachrichtigt_am: string | null
          eltern_email: string
          erstellt_am: string | null
          essensspenden_json: Json | null
          event_id: string | null
          helfer_aufgaben_json: Json | null
          id: string
          ist_springer: boolean | null
          kind_klasse: string
          kind_nachname: string
          kind_vorname: string
          kommentar: string | null
          springer_zeitfenster: string | null
          token: string | null
          verifiziert: boolean | null
          verifiziert_am: string | null
          weitere_kinder_json: Json | null
        }
        Insert: {
          benachrichtigt_am?: string | null
          eltern_email: string
          erstellt_am?: string | null
          essensspenden_json?: Json | null
          event_id?: string | null
          helfer_aufgaben_json?: Json | null
          id?: string
          ist_springer?: boolean | null
          kind_klasse: string
          kind_nachname: string
          kind_vorname: string
          kommentar?: string | null
          springer_zeitfenster?: string | null
          token?: string | null
          verifiziert?: boolean | null
          verifiziert_am?: string | null
          weitere_kinder_json?: Json | null
        }
        Update: {
          benachrichtigt_am?: string | null
          eltern_email?: string
          erstellt_am?: string | null
          essensspenden_json?: Json | null
          event_id?: string | null
          helfer_aufgaben_json?: Json | null
          id?: string
          ist_springer?: boolean | null
          kind_klasse?: string
          kind_nachname?: string
          kind_vorname?: string
          kommentar?: string | null
          springer_zeitfenster?: string | null
          token?: string | null
          verifiziert?: boolean | null
          verifiziert_am?: string | null
          weitere_kinder_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "anmeldungen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ansprechpartner: {
        Row: {
          bereich: string
          erstellt_am: string | null
          event_id: string | null
          id: string
          name: string
          telefonnummer: string | null
        }
        Insert: {
          bereich: string
          erstellt_am?: string | null
          event_id?: string | null
          id?: string
          name: string
          telefonnummer?: string | null
        }
        Update: {
          bereich?: string
          erstellt_am?: string | null
          event_id?: string | null
          id?: string
          name?: string
          telefonnummer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ansprechpartner_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      aufgaben_ansprechpartner: {
        Row: {
          ansprechpartner_id: string
          aufgabe_id: string
          id: string
        }
        Insert: {
          ansprechpartner_id: string
          aufgabe_id: string
          id?: string
        }
        Update: {
          ansprechpartner_id?: string
          aufgabe_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aufgaben_ansprechpartner_ansprechpartner_id_fkey"
            columns: ["ansprechpartner_id"]
            isOneToOne: false
            referencedRelation: "ansprechpartner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aufgaben_ansprechpartner_aufgabe_id_fkey"
            columns: ["aufgabe_id"]
            isOneToOne: false
            referencedRelation: "helferaufgaben"
            referencedColumns: ["id"]
          },
        ]
      }
      ergebnisse: {
        Row: {
          erfasst_am: string
          event_id: string | null
          id: string
          kind_id: string
          spiel_id: string
          spielgruppe_id: string
          wert_numeric: number
        }
        Insert: {
          erfasst_am?: string
          event_id?: string | null
          id?: string
          kind_id: string
          spiel_id: string
          spielgruppe_id: string
          wert_numeric: number
        }
        Update: {
          erfasst_am?: string
          event_id?: string | null
          id?: string
          kind_id?: string
          spiel_id?: string
          spielgruppe_id?: string
          wert_numeric?: number
        }
        Relationships: [
          {
            foreignKeyName: "ergebnisse_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ergebnisse_spiel_id_fkey"
            columns: ["spiel_id"]
            isOneToOne: false
            referencedRelation: "spiele"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ergebnisse_spielgruppe_id_fkey"
            columns: ["spielgruppe_id"]
            isOneToOne: false
            referencedRelation: "spielgruppen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ergebnisse_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      essensspenden_bedarf: {
        Row: {
          anzahl_benoetigt: number
          beschreibung: string | null
          created_at: string | null
          event_id: string | null
          id: string
          titel: string
        }
        Insert: {
          anzahl_benoetigt?: number
          beschreibung?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          titel: string
        }
        Update: {
          anzahl_benoetigt?: number
          beschreibung?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: "essensspenden_bedarf_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      essensspenden_rueckmeldungen: {
        Row: {
          anmerkung: string | null
          bestaetigt: boolean
          erstellt_am: string | null
          event_id: string | null
          freitext: string | null
          id: string
          kind_identifier: string
          menge: number
          spende_id: string | null
        }
        Insert: {
          anmerkung?: string | null
          bestaetigt?: boolean
          erstellt_am?: string | null
          event_id?: string | null
          freitext?: string | null
          id?: string
          kind_identifier: string
          menge?: number
          spende_id?: string | null
        }
        Update: {
          anmerkung?: string | null
          bestaetigt?: boolean
          erstellt_am?: string | null
          event_id?: string | null
          freitext?: string | null
          id?: string
          kind_identifier?: string
          menge?: number
          spende_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "essensspenden_rueckmeldungen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essensspenden_rueckmeldungen_spende_id_fkey"
            columns: ["spende_id"]
            isOneToOne: false
            referencedRelation: "essensspenden_bedarf"
            referencedColumns: ["id"]
          },
        ]
      }
      event_spiele: {
        Row: {
          event_id: string
          spiel_id: string
        }
        Insert: {
          event_id: string
          spiel_id: string
        }
        Update: {
          event_id?: string
          spiel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_spiele_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_spiele_spiel_id_fkey"
            columns: ["spiel_id"]
            isOneToOne: false
            referencedRelation: "spiele"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          anmeldeschluss: string | null
          created_at: string
          datum: string | null
          essensspenden_verteilt_am: string | null
          id: string
          ist_aktiv: boolean
          jahr: number
          name: string
        }
        Insert: {
          anmeldeschluss?: string | null
          created_at?: string
          datum?: string | null
          essensspenden_verteilt_am?: string | null
          id?: string
          ist_aktiv?: boolean
          jahr: number
          name: string
        }
        Update: {
          anmeldeschluss?: string | null
          created_at?: string
          datum?: string | null
          essensspenden_verteilt_am?: string | null
          id?: string
          ist_aktiv?: boolean
          jahr?: number
          name?: string
        }
        Relationships: []
      }
      externe_helfer: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq_eintraege: {
        Row: {
          antwort: string
          created_at: string | null
          frage: string
          id: string
          kategorie_id: string | null
          sortierung: number
        }
        Insert: {
          antwort: string
          created_at?: string | null
          frage: string
          id?: string
          kategorie_id?: string | null
          sortierung?: number
        }
        Update: {
          antwort?: string
          created_at?: string | null
          frage?: string
          id?: string
          kategorie_id?: string | null
          sortierung?: number
        }
        Relationships: [
          {
            foreignKeyName: "faq_eintraege_kategorie_id_fkey"
            columns: ["kategorie_id"]
            isOneToOne: false
            referencedRelation: "faq_kategorien"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_kategorien: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sortierung: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sortierung?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sortierung?: number
        }
        Relationships: []
      }
      generierte_pdfs: {
        Row: {
          dateiname: string
          erstellt_am: string | null
          id: string
          kind_id: string
        }
        Insert: {
          dateiname: string
          erstellt_am?: string | null
          id?: string
          kind_id: string
        }
        Update: {
          dateiname?: string
          erstellt_am?: string | null
          id?: string
          kind_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generierte_pdfs_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
        ]
      }
      helfer_rueckmeldungen: {
        Row: {
          aufgabe_id: string | null
          erstellt_am: string
          event_id: string | null
          freitext: string | null
          id: string
          ist_springer: boolean
          kind_id: string | null
          kind_name_extern: string | null
          kommentar: string | null
          prioritaet: number | null
          zeitfenster: string | null
        }
        Insert: {
          aufgabe_id?: string | null
          erstellt_am?: string
          event_id?: string | null
          freitext?: string | null
          id?: string
          ist_springer?: boolean
          kind_id?: string | null
          kind_name_extern?: string | null
          kommentar?: string | null
          prioritaet?: number | null
          zeitfenster?: string | null
        }
        Update: {
          aufgabe_id?: string | null
          erstellt_am?: string
          event_id?: string | null
          freitext?: string | null
          id?: string
          ist_springer?: boolean
          kind_id?: string | null
          kind_name_extern?: string | null
          kommentar?: string | null
          prioritaet?: number | null
          zeitfenster?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helfer_rueckmeldungen_aufgabe_id_fkey"
            columns: ["aufgabe_id"]
            isOneToOne: false
            referencedRelation: "helferaufgaben"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helfer_rueckmeldungen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helfer_rueckmeldungen_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
        ]
      }
      helfer_slot_zuteilungen: {
        Row: {
          erstellt_am: string | null
          event_id: string | null
          id: string
          kommentar: string | null
          slot_id: string
          zuteilung_id: string
        }
        Insert: {
          erstellt_am?: string | null
          event_id?: string | null
          id?: string
          kommentar?: string | null
          slot_id: string
          zuteilung_id: string
        }
        Update: {
          erstellt_am?: string | null
          event_id?: string | null
          id?: string
          kommentar?: string | null
          slot_id?: string
          zuteilung_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helfer_slot_zuteilungen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helfer_slot_zuteilungen_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "helfer_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helfer_slot_zuteilungen_zuteilung_id_fkey"
            columns: ["zuteilung_id"]
            isOneToOne: false
            referencedRelation: "helfer_zuteilungen"
            referencedColumns: ["id"]
          },
        ]
      }
      helfer_slots: {
        Row: {
          aufgabe_id: string
          beschreibung: string
          created_at: string | null
          endzeit: string | null
          event_id: string | null
          id: string
          max_helfer: number
          startzeit: string | null
        }
        Insert: {
          aufgabe_id: string
          beschreibung: string
          created_at?: string | null
          endzeit?: string | null
          event_id?: string | null
          id?: string
          max_helfer?: number
          startzeit?: string | null
        }
        Update: {
          aufgabe_id?: string
          beschreibung?: string
          created_at?: string | null
          endzeit?: string | null
          event_id?: string | null
          id?: string
          max_helfer?: number
          startzeit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helfer_slots_aufgabe_id_fkey"
            columns: ["aufgabe_id"]
            isOneToOne: false
            referencedRelation: "helferaufgaben"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helfer_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      helfer_spiel_zuteilungen: {
        Row: {
          created_at: string
          event_id: string | null
          helfer_id: string
          id: string
          spiel_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          helfer_id: string
          id?: string
          spiel_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          helfer_id?: string
          id?: string
          spiel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helfer_spiel_zuteilungen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helfer_spiel_zuteilungen_helfer_id_fkey"
            columns: ["helfer_id"]
            isOneToOne: false
            referencedRelation: "helfer_zuteilungen"
            referencedColumns: ["id"]
          },
        ]
      }
      helfer_zuteilungen: {
        Row: {
          aufgabe_id: string | null
          event_id: string | null
          externer_helfer_id: string | null
          id: string
          kind_id: string | null
          manuell: boolean
          rueckmeldung_id: string | null
          via_springer: boolean
          zeitfenster: string
          zugewiesen_am: string
        }
        Insert: {
          aufgabe_id?: string | null
          event_id?: string | null
          externer_helfer_id?: string | null
          id?: string
          kind_id?: string | null
          manuell?: boolean
          rueckmeldung_id?: string | null
          via_springer?: boolean
          zeitfenster: string
          zugewiesen_am?: string
        }
        Update: {
          aufgabe_id?: string | null
          event_id?: string | null
          externer_helfer_id?: string | null
          id?: string
          kind_id?: string | null
          manuell?: boolean
          rueckmeldung_id?: string | null
          via_springer?: boolean
          zeitfenster?: string
          zugewiesen_am?: string
        }
        Relationships: [
          {
            foreignKeyName: "helfer_zuteilungen_aufgabe_id_fkey"
            columns: ["aufgabe_id"]
            isOneToOne: false
            referencedRelation: "helferaufgaben"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helfer_zuteilungen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helfer_zuteilungen_externer_helfer_id_fkey"
            columns: ["externer_helfer_id"]
            isOneToOne: false
            referencedRelation: "externe_helfer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helfer_zuteilungen_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helfer_zuteilungen_rueckmeldung_id_fkey"
            columns: ["rueckmeldung_id"]
            isOneToOne: true
            referencedRelation: "helfer_rueckmeldungen"
            referencedColumns: ["id"]
          },
        ]
      }
      helferaufgaben: {
        Row: {
          bedarf: number
          beschreibung: string | null
          created_at: string
          event_id: string | null
          has_slots: boolean | null
          id: string
          is_game_supervisor: boolean
          titel: string
          zeitfenster: string
        }
        Insert: {
          bedarf?: number
          beschreibung?: string | null
          created_at?: string
          event_id?: string | null
          has_slots?: boolean | null
          id?: string
          is_game_supervisor?: boolean
          titel: string
          zeitfenster?: string
        }
        Update: {
          bedarf?: number
          beschreibung?: string | null
          created_at?: string
          event_id?: string | null
          has_slots?: boolean | null
          id?: string
          is_game_supervisor?: boolean
          titel?: string
          zeitfenster?: string
        }
        Relationships: [
          {
            foreignKeyName: "helferaufgaben_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      historie_eintraege: {
        Row: {
          anmerkung: string | null
          created_at: string | null
          id: string
          jahr: number
          klasse: string
          koenig: string | null
          koenigin: string | null
        }
        Insert: {
          anmerkung?: string | null
          created_at?: string | null
          id?: string
          jahr: number
          klasse: string
          koenig?: string | null
          koenigin?: string | null
        }
        Update: {
          anmerkung?: string | null
          created_at?: string | null
          id?: string
          jahr?: number
          klasse?: string
          koenig?: string | null
          koenigin?: string | null
        }
        Relationships: []
      }
      kind_spielgruppe_zuordnung: {
        Row: {
          created_at: string
          event_id: string
          id: string
          kind_id: string
          spielgruppe_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          kind_id: string
          spielgruppe_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          kind_id?: string
          spielgruppe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kind_spielgruppe_zuordnung_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kind_spielgruppe_zuordnung_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kind_spielgruppe_zuordnung_spielgruppe_id_fkey"
            columns: ["spielgruppe_id"]
            isOneToOne: false
            referencedRelation: "spielgruppen"
            referencedColumns: ["id"]
          },
        ]
      }
      kinder: {
        Row: {
          created_at: string
          event_id: string | null
          geschlecht: Database["public"]["Enums"]["geschlecht_enum"]
          id: string
          klasse: string | null
          klasse_id: string | null
          nachname: string
          vorname: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          geschlecht: Database["public"]["Enums"]["geschlecht_enum"]
          id?: string
          klasse?: string | null
          klasse_id?: string | null
          nachname: string
          vorname: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          geschlecht?: Database["public"]["Enums"]["geschlecht_enum"]
          id?: string
          klasse?: string | null
          klasse_id?: string | null
          nachname?: string
          vorname?: string
        }
        Relationships: [
          {
            foreignKeyName: "kinder_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kinder_klasse_id_fkey"
            columns: ["klasse_id"]
            isOneToOne: false
            referencedRelation: "klassen"
            referencedColumns: ["id"]
          },
        ]
      }
      kinder_ignoriert: {
        Row: {
          event_id: string
          id: string
          ignoriert_am: string
          kind_id: string
        }
        Insert: {
          event_id: string
          id?: string
          ignoriert_am?: string
          kind_id: string
        }
        Update: {
          event_id?: string
          id?: string
          ignoriert_am?: string
          kind_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kinder_ignoriert_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kinder_ignoriert_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
        ]
      }
      kinder_log: {
        Row: {
          aktion: string
          altwerte: Json | null
          event_id: string | null
          id: string
          kind_id: string | null
          neuwert: Json | null
          timestamp: string | null
          user_email: string | null
        }
        Insert: {
          aktion: string
          altwerte?: Json | null
          event_id?: string | null
          id?: string
          kind_id?: string | null
          neuwert?: Json | null
          timestamp?: string | null
          user_email?: string | null
        }
        Update: {
          aktion?: string
          altwerte?: Json | null
          event_id?: string | null
          id?: string
          kind_id?: string | null
          neuwert?: Json | null
          timestamp?: string | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kinder_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kinder_log_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
        ]
      }
      klasse_spiele: {
        Row: {
          created_at: string
          klasse_id: string
          spiel_id: string
        }
        Insert: {
          created_at?: string
          klasse_id: string
          spiel_id: string
        }
        Update: {
          created_at?: string
          klasse_id?: string
          spiel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "klasse_spiele_klasse_id_fkey"
            columns: ["klasse_id"]
            isOneToOne: false
            referencedRelation: "klassen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klasse_spiele_spiel_id_fkey"
            columns: ["spiel_id"]
            isOneToOne: false
            referencedRelation: "spiele"
            referencedColumns: ["id"]
          },
        ]
      }
      klassen: {
        Row: {
          created_at: string
          event_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "klassen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      kontaktanfragen: {
        Row: {
          created_at: string
          email: string
          id: string
          nachricht: string | null
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nachricht?: string | null
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nachricht?: string | null
          name?: string
        }
        Relationships: []
      }
      seiteneinstellungen: {
        Row: {
          beschreibung: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          beschreibung?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          beschreibung?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      spiele: {
        Row: {
          anzahl_versuche: number | null
          beschreibung: string | null
          created_at: string
          einheit: string | null
          icon: string | null
          id: string
          name: string
          ort: string | null
          regeln: string | null
          startpunkte: number | null
          strafzeit_sekunden: number | null
          wertungstyp: Database["public"]["Enums"]["wertungstyp_enum"]
          zeitlimit_sekunden: number | null
          ziel: string | null
        }
        Insert: {
          anzahl_versuche?: number | null
          beschreibung?: string | null
          created_at?: string
          einheit?: string | null
          icon?: string | null
          id?: string
          name: string
          ort?: string | null
          regeln?: string | null
          startpunkte?: number | null
          strafzeit_sekunden?: number | null
          wertungstyp: Database["public"]["Enums"]["wertungstyp_enum"]
          zeitlimit_sekunden?: number | null
          ziel?: string | null
        }
        Update: {
          anzahl_versuche?: number | null
          beschreibung?: string | null
          created_at?: string
          einheit?: string | null
          icon?: string | null
          id?: string
          name?: string
          ort?: string | null
          regeln?: string | null
          startpunkte?: number | null
          strafzeit_sekunden?: number | null
          wertungstyp?: Database["public"]["Enums"]["wertungstyp_enum"]
          zeitlimit_sekunden?: number | null
          ziel?: string | null
        }
        Relationships: []
      }
      spielgruppe_spiel_status: {
        Row: {
          abgeschlossen_am: string
          event_id: string | null
          spiel_id: string
          spielgruppe_id: string
        }
        Insert: {
          abgeschlossen_am?: string
          event_id?: string | null
          spiel_id: string
          spielgruppe_id: string
        }
        Update: {
          abgeschlossen_am?: string
          event_id?: string | null
          spiel_id?: string
          spielgruppe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_spielgruppe_spiel_status_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spielgruppe_spiel_status_spiel_id_fkey"
            columns: ["spiel_id"]
            isOneToOne: false
            referencedRelation: "spiele"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spielgruppe_spiel_status_spielgruppe_id_fkey"
            columns: ["spielgruppe_id"]
            isOneToOne: false
            referencedRelation: "spielgruppen"
            referencedColumns: ["id"]
          },
        ]
      }
      spielgruppen: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          klasse: string | null
          leiter_zugangscode: string
          name: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          klasse?: string | null
          leiter_zugangscode: string
          name: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          klasse?: string | null
          leiter_zugangscode?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_spielgruppen_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsoren: {
        Row: {
          created_at: string | null
          id: string
          kategorie: string | null
          logo_url: string | null
          name: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kategorie?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kategorie?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      spielpunkte_pro_kind: {
        Row: {
          gruppe_id: string | null
          kind_id: string | null
          kind_name: string | null
          klasse: string | null
          punkte: number | null
          rang: number | null
          spiel_id: string | null
          spiel_name: string | null
          wert: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ergebnisse_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ergebnisse_spiel_id_fkey"
            columns: ["spiel_id"]
            isOneToOne: false
            referencedRelation: "spiele"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ergebnisse_spielgruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "spielgruppen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      berechne_gesamtpunkte_pro_kind: {
        Args: never
        Returns: {
          anzahl_spiele: number
          gesamt_spiele: number
          gesamtpunkte: number
          geschlecht: string
          ist_koenig: boolean
          ist_koenigin: boolean
          kind_id: string
          kind_name: string
          klasse: string
          rang: number
          spielgruppe_name: string
          status: string
        }[]
      }
      jwt_decode: { Args: { token: string }; Returns: Json }
      set_leiter_gruppe: { Args: { gruppe: string }; Returns: undefined }
    }
    Enums: {
      geschlecht_enum: "Junge" | "Mädchen"
      wertungstyp_enum:
        | "WEITE_MAX_AUS_N"
        | "MENGE_MAX_ZEIT"
        | "ZEIT_MIN_STRAFE"
        | "PUNKTE_SUMME_AUS_N"
        | "PUNKTE_ABZUG"
        | "PUNKTE_MAX_EINZEL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      geschlecht_enum: ["Junge", "Mädchen"],
      wertungstyp_enum: [
        "WEITE_MAX_AUS_N",
        "MENGE_MAX_ZEIT",
        "ZEIT_MIN_STRAFE",
        "PUNKTE_SUMME_AUS_N",
        "PUNKTE_ABZUG",
        "PUNKTE_MAX_EINZEL",
      ],
    },
  },
} as const
