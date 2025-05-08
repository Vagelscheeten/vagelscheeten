export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
          created_at: string
          id: string
          ist_aktiv: boolean
          jahr: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          ist_aktiv?: boolean
          jahr: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          ist_aktiv?: boolean
          jahr?: number
          name?: string
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
      spiele: {
        Row: {
          anzahl_versuche: number | null
          beschreibung: string | null
          created_at: string
          einheit: string | null
          id: string
          name: string
          startpunkte: number | null
          strafzeit_sekunden: number | null
          wertungstyp: Database["public"]["Enums"]["wertungstyp_enum"]
          zeitlimit_sekunden: number | null
        }
        Insert: {
          anzahl_versuche?: number | null
          beschreibung?: string | null
          created_at?: string
          einheit?: string | null
          id?: string
          name: string
          startpunkte?: number | null
          strafzeit_sekunden?: number | null
          wertungstyp: Database["public"]["Enums"]["wertungstyp_enum"]
          zeitlimit_sekunden?: number | null
        }
        Update: {
          anzahl_versuche?: number | null
          beschreibung?: string | null
          created_at?: string
          einheit?: string | null
          id?: string
          name?: string
          startpunkte?: number | null
          strafzeit_sekunden?: number | null
          wertungstyp?: Database["public"]["Enums"]["wertungstyp_enum"]
          zeitlimit_sekunden?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      jwt_decode: {
        Args: { token: string }
        Returns: Json
      }
      set_leiter_gruppe: {
        Args: { gruppe: string }
        Returns: undefined
      }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
