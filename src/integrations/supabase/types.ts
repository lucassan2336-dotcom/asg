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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["announcement_audience"]
          body: string
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      associate_profiles: {
        Row: {
          age: number | null
          associate_metadata: Json
          associate_notes: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          associate_metadata?: Json
          associate_notes?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          associate_metadata?: Json
          associate_notes?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      association_memberships: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          member_since: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          member_since?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          member_since?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "association_memberships_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "membership_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      championship_podiums: {
        Row: {
          championship_name: string
          created_at: string
          created_by: string | null
          event_date: string
          first_place_skater_id: string
          first_points: number
          id: string
          modality: Database["public"]["Enums"]["skate_modality"]
          notes: string | null
          second_place_skater_id: string
          second_points: number
          status: string
          third_place_skater_id: string
          third_points: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          championship_name: string
          created_at?: string
          created_by?: string | null
          event_date: string
          first_place_skater_id: string
          first_points: number
          id?: string
          modality: Database["public"]["Enums"]["skate_modality"]
          notes?: string | null
          second_place_skater_id: string
          second_points: number
          status?: string
          third_place_skater_id: string
          third_points: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          championship_name?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          first_place_skater_id?: string
          first_points?: number
          id?: string
          modality?: Database["public"]["Enums"]["skate_modality"]
          notes?: string | null
          second_place_skater_id?: string
          second_points?: number
          status?: string
          third_place_skater_id?: string
          third_points?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "championship_podiums_first_place_skater_id_fkey"
            columns: ["first_place_skater_id"]
            isOneToOne: false
            referencedRelation: "skater_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championship_podiums_second_place_skater_id_fkey"
            columns: ["second_place_skater_id"]
            isOneToOne: false
            referencedRelation: "skater_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championship_podiums_third_place_skater_id_fkey"
            columns: ["third_place_skater_id"]
            isOneToOne: false
            referencedRelation: "skater_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_results: {
        Row: {
          athlete_name: string
          category: string
          championship_name: string
          created_at: string
          created_by: string | null
          event_date: string | null
          id: string
          notes: string | null
          position: number
          published: boolean
          score: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          athlete_name: string
          category: string
          championship_name: string
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          id?: string
          notes?: string | null
          position: number
          published?: boolean
          score?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          athlete_name?: string
          category?: string
          championship_name?: string
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          id?: string
          notes?: string | null
          position?: number
          published?: boolean
          score?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          location: string | null
          published: boolean
          registration_open: boolean
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          location?: string | null
          published?: boolean
          registration_open?: boolean
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          location?: string | null
          published?: boolean
          registration_open?: boolean
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          storage_path: string
          transaction_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          storage_path: string
          transaction_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          storage_path?: string
          transaction_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["finance_kind"]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["finance_kind"]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["finance_kind"]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          amount_cents: number
          cancellation_reason: string | null
          category_id: string | null
          competency_date: string | null
          created_at: string
          created_by: string | null
          description: string
          donor_name: string | null
          entry_type: string
          id: string
          idempotency_key: string | null
          is_donation: boolean
          is_reversal: boolean
          kind: Database["public"]["Enums"]["finance_kind"]
          notes: string | null
          occurred_on: string
          original_transaction_id: string | null
          payment_method: string | null
          settlement_date: string | null
          status: Database["public"]["Enums"]["financial_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          amount_cents?: number
          cancellation_reason?: string | null
          category_id?: string | null
          competency_date?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          donor_name?: string | null
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          is_donation?: boolean
          is_reversal?: boolean
          kind: Database["public"]["Enums"]["finance_kind"]
          notes?: string | null
          occurred_on: string
          original_transaction_id?: string | null
          payment_method?: string | null
          settlement_date?: string | null
          status?: Database["public"]["Enums"]["financial_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_cents?: number
          cancellation_reason?: string | null
          category_id?: string | null
          competency_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          donor_name?: string | null
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          is_donation?: boolean
          is_reversal?: boolean
          kind?: Database["public"]["Enums"]["finance_kind"]
          notes?: string | null
          occurred_on?: string
          original_transaction_id?: string | null
          payment_method?: string | null
          settlement_date?: string | null
          status?: Database["public"]["Enums"]["financial_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          event_name: string | null
          id: string
          image_url: string
          published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          event_name?: string | null
          id?: string
          image_url: string
          published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          event_name?: string | null
          id?: string
          image_url?: string
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      membership_applications: {
        Row: {
          birth_date: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          motivation: string | null
          phone: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          motivation?: string | null
          phone?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          motivation?: string | null
          phone?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      membership_review_notes: {
        Row: {
          application_id: string
          author_id: string
          created_at: string
          id: string
          note: string
        }
        Insert: {
          application_id: string
          author_id: string
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          application_id?: string
          author_id?: string
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_review_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "membership_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          body: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_kind"]
          age: number | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          show_age_publicly: boolean
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_kind"]
          age?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          show_age_publicly?: boolean
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_kind"]
          age?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          show_age_publicly?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ranking_scoring_config: {
        Row: {
          first_place_points: number
          id: number
          second_place_points: number
          third_place_points: number
          tiebreaker_rule: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          first_place_points?: number
          id?: number
          second_place_points?: number
          third_place_points?: number
          tiebreaker_rule?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          first_place_points?: number
          id?: number
          second_place_points?: number
          third_place_points?: number
          tiebreaker_rule?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: Json
          created_at: string
          id: string
          page_slug: string
          section_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          page_slug: string
          section_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          page_slug?: string
          section_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_projects: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          image_url: string | null
          published: boolean
          sort_order: number
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          image_url?: string | null
          published?: boolean
          sort_order?: number
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_url?: string | null
          published?: boolean
          sort_order?: number
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      skater_profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          favorite_trick: string
          first_places: number
          full_name: string
          id: string
          is_active: boolean
          modality: Database["public"]["Enums"]["skate_modality"]
          second_places: number
          show_age_publicly: boolean
          stance: string | null
          third_places: number
          total_points: number
          updated_at: string
          user_id: string
          years_practicing: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          favorite_trick?: string
          first_places?: number
          full_name: string
          id?: string
          is_active?: boolean
          modality: Database["public"]["Enums"]["skate_modality"]
          second_places?: number
          show_age_publicly?: boolean
          stance?: string | null
          third_places?: number
          total_points?: number
          updated_at?: string
          user_id: string
          years_practicing?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          favorite_trick?: string
          first_places?: number
          full_name?: string
          id?: string
          is_active?: boolean
          modality?: Database["public"]["Enums"]["skate_modality"]
          second_places?: number
          show_age_publicly?: boolean
          stance?: string | null
          third_places?: number
          total_points?: number
          updated_at?: string
          user_id?: string
          years_practicing?: string
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          published: boolean
          sort_order: number
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          published?: boolean
          sort_order?: number
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          published?: boolean
          sort_order?: number
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_manage_skater_profile: {
        Args: {
          _is_active?: boolean
          _modality: Database["public"]["Enums"]["skate_modality"]
          _target_user_id: string
        }
        Returns: string
      }
      cancel_financial_transaction: {
        Args: { _reason: string; _transaction_id: string }
        Returns: undefined
      }
      get_financial_summary: {
        Args: { _end_date: string; _start_date: string }
        Returns: {
          calculated_balance: number
          net_cash_flow: number
          opening_balance: number
          paid_expenses: number
          pending_payables: number
          pending_receivables: number
          received_donations: number
          received_revenues: number
        }[]
      }
      get_modality_ranking: {
        Args: { _modality: Database["public"]["Enums"]["skate_modality"] }
        Returns: {
          age: number
          avatar_url: string
          favorite_trick: string
          first_places: number
          full_name: string
          modality: Database["public"]["Enums"]["skate_modality"]
          rank_position: number
          second_places: number
          skater_id: string
          stance: string
          third_places: number
          total_points: number
          trophy_tier: string
          user_id: string
          years_practicing: string
        }[]
      }
      get_skater_championship_history: {
        Args: { _skater_id: string }
        Returns: {
          championship_id: string
          championship_name: string
          event_date: string
          modality: Database["public"]["Enums"]["skate_modality"]
          notes: string
          placement: number
          points_awarded: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_registered_users_for_diretoria: {
        Args: never
        Returns: {
          birth_date: string
          created_at: string
          email: string
          full_name: string
          is_associado: boolean
          is_diretoria: boolean
          member_since: string
          membership_status: string
          phone: string
          user_id: string
        }[]
      }
      recalculate_all_skater_rankings: { Args: never; Returns: undefined }
      reopen_application: {
        Args: { _application_id: string; _reason: string }
        Returns: undefined
      }
      reverse_financial_transaction: {
        Args: { _reason: string; _transaction_id: string }
        Returns: string
      }
      review_application: {
        Args: { _application_id: string; _approve: boolean; _notes?: string }
        Returns: undefined
      }
      set_user_role_by_diretoria: {
        Args: {
          _grant: boolean
          _notes?: string
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      write_audit: {
        Args: {
          _action: string
          _details?: Json
          _record: string
          _table: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_kind: "skatista" | "associado"
      announcement_audience: "publico" | "associados"
      app_role: "diretoria" | "associado"
      application_status: "pendente" | "aprovada" | "rejeitada"
      finance_kind: "receita" | "despesa"
      financial_status:
        | "previsto"
        | "pendente"
        | "recebido"
        | "pago"
        | "cancelado"
      membership_status: "ativa" | "suspensa" | "encerrada"
      registration_status: "inscrito" | "cancelado" | "presente"
      skate_modality: "street" | "vert" | "versatil" | "escolher_depois"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_kind: ["skatista", "associado"],
      announcement_audience: ["publico", "associados"],
      app_role: ["diretoria", "associado"],
      application_status: ["pendente", "aprovada", "rejeitada"],
      finance_kind: ["receita", "despesa"],
      financial_status: [
        "previsto",
        "pendente",
        "recebido",
        "pago",
        "cancelado",
      ],
      membership_status: ["ativa", "suspensa", "encerrada"],
      registration_status: ["inscrito", "cancelado", "presente"],
      skate_modality: ["street", "vert", "versatil", "escolher_depois"],
    },
  },
} as const
