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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academy_bookings: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          session_id: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          session_id: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          session_id?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academy_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_sessions: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          end_at: string
          id: string
          is_active: boolean
          is_public: boolean
          location_text: string | null
          price_display: string | null
          start_at: string
          tenant_id: string
          title: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          end_at: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          location_text?: string | null
          price_display?: string | null
          start_at: string
          tenant_id: string
          title: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          end_at?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          location_text?: string | null
          price_display?: string | null
          start_at?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      breeders: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          name_ar: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          name_ar?: string | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_attempts: {
        Row: {
          assigned_to: string | null
          attempt_date: string
          attempt_type: string
          created_at: string
          created_by: string
          external_stallion_meta: Json | null
          external_stallion_name: string | null
          heat_cycle_ref: string | null
          id: string
          location_ref: string | null
          mare_id: string
          notes: string | null
          result: string
          semen_batch_id: string | null
          stallion_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attempt_date: string
          attempt_type: string
          created_at?: string
          created_by: string
          external_stallion_meta?: Json | null
          external_stallion_name?: string | null
          heat_cycle_ref?: string | null
          id?: string
          location_ref?: string | null
          mare_id: string
          notes?: string | null
          result?: string
          semen_batch_id?: string | null
          stallion_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attempt_date?: string
          attempt_type?: string
          created_at?: string
          created_by?: string
          external_stallion_meta?: Json | null
          external_stallion_name?: string | null
          heat_cycle_ref?: string | null
          id?: string
          location_ref?: string | null
          mare_id?: string
          notes?: string | null
          result?: string
          semen_batch_id?: string | null
          stallion_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_attempts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_attempts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_attempts_mare_id_fkey"
            columns: ["mare_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_attempts_semen_batch_id_fkey"
            columns: ["semen_batch_id"]
            isOneToOne: false
            referencedRelation: "semen_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_attempts_stallion_id_fkey"
            columns: ["stallion_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_events: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          event_type: string
          from_status: string | null
          id: string
          payload: Json | null
          tenant_id: string
          to_status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          from_status?: string | null
          id?: string
          payload?: Json | null
          tenant_id: string
          to_status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          from_status?: string | null
          id?: string
          payload?: Json | null
          tenant_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breeding_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          name: string
          name_ar: string | null
          notes: string | null
          outstanding_balance: number | null
          phone: string | null
          preferred_payment_method: string | null
          status: string
          tax_number: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name: string
          name_ar?: string | null
          notes?: string | null
          outstanding_balance?: number | null
          phone?: string | null
          preferred_payment_method?: string | null
          status?: string
          tax_number?: string | null
          tenant_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          notes?: string | null
          outstanding_balance?: number | null
          phone?: string | null
          preferred_payment_method?: string | null
          status?: string
          tax_number?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_financial_categories: {
        Row: {
          account_code: string | null
          category_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          parent_id: string | null
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          account_code?: string | null
          category_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          parent_id?: string | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          account_code?: string | null
          category_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_financial_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "custom_financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_financial_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_financial_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      embryo_transfers: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          donor_attempt_id: string | null
          donor_mare_id: string
          embryo_count: number
          embryo_grade: string | null
          flush_date: string | null
          id: string
          notes: string | null
          recipient_mare_id: string
          status: string
          tenant_id: string
          transfer_date: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          donor_attempt_id?: string | null
          donor_mare_id: string
          embryo_count?: number
          embryo_grade?: string | null
          flush_date?: string | null
          id?: string
          notes?: string | null
          recipient_mare_id: string
          status?: string
          tenant_id: string
          transfer_date?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          donor_attempt_id?: string | null
          donor_mare_id?: string
          embryo_count?: number
          embryo_grade?: string | null
          flush_date?: string | null
          id?: string
          notes?: string | null
          recipient_mare_id?: string
          status?: string
          tenant_id?: string
          transfer_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "embryo_transfers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embryo_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embryo_transfers_donor_attempt_id_fkey"
            columns: ["donor_attempt_id"]
            isOneToOne: false
            referencedRelation: "breeding_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embryo_transfers_donor_mare_id_fkey"
            columns: ["donor_mare_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embryo_transfers_recipient_mare_id_fkey"
            columns: ["recipient_mare_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embryo_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embryo_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          account_code: string | null
          actual_cost: number | null
          client_id: string | null
          created_at: string
          created_by: string
          currency: string
          custom_financial_category_id: string | null
          entity_id: string
          entity_type: string
          estimated_cost: number | null
          external_provider_id: string | null
          id: string
          internal_resource_ref: Json | null
          is_income: boolean
          notes: string | null
          service_mode: string
          tax_category: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_code?: string | null
          actual_cost?: number | null
          client_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          custom_financial_category_id?: string | null
          entity_id: string
          entity_type: string
          estimated_cost?: number | null
          external_provider_id?: string | null
          id?: string
          internal_resource_ref?: Json | null
          is_income?: boolean
          notes?: string | null
          service_mode?: string
          tax_category?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_code?: string | null
          actual_cost?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          custom_financial_category_id?: string | null
          entity_id?: string
          entity_type?: string
          estimated_cost?: number | null
          external_provider_id?: string | null
          id?: string
          internal_resource_ref?: Json | null
          is_income?: boolean
          notes?: string | null
          service_mode?: string
          tax_category?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_custom_financial_category_id_fkey"
            columns: ["custom_financial_category_id"]
            isOneToOne: false
            referencedRelation: "custom_financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_external_provider_id_fkey"
            columns: ["external_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_aliases: {
        Row: {
          alias: string
          created_at: string
          created_by: string
          horse_id: string
          id: string
          is_active: boolean
          tenant_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          created_by: string
          horse_id: string
          id?: string
          is_active?: boolean
          tenant_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          created_by?: string
          horse_id?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_aliases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_aliases_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_aliases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_aliases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_breeds: {
        Row: {
          created_at: string
          id: string
          name: string
          name_ar: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_ar?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_ar?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_breeds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_breeds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_colors: {
        Row: {
          created_at: string
          id: string
          name: string
          name_ar: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_ar?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_ar?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_colors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_colors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_order_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          from_status: string | null
          id: string
          order_id: string
          payload: Json | null
          tenant_id: string
          to_status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          order_id: string
          payload?: Json | null
          tenant_id: string
          to_status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          order_id?: string
          payload?: Json | null
          tenant_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_order_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "horse_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_order_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_order_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_order_types: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          pin_as_tab: boolean
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          pin_as_tab?: boolean
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          pin_as_tab?: boolean
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_order_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_order_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_orders: {
        Row: {
          account_code: string | null
          actual_cost: number | null
          assigned_to: string | null
          category: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          currency: string
          estimated_cost: number | null
          external_provider_id: string | null
          external_provider_meta: Json | null
          external_provider_name: string | null
          financial_category: string | null
          horse_id: string
          id: string
          internal_resource_ref: Json | null
          is_income: boolean
          notes: string | null
          order_type_id: string
          priority: string
          requested_at: string
          scheduled_for: string | null
          service_mode: string
          status: string
          tax_category: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_code?: string | null
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          currency?: string
          estimated_cost?: number | null
          external_provider_id?: string | null
          external_provider_meta?: Json | null
          external_provider_name?: string | null
          financial_category?: string | null
          horse_id: string
          id?: string
          internal_resource_ref?: Json | null
          is_income?: boolean
          notes?: string | null
          order_type_id: string
          priority?: string
          requested_at?: string
          scheduled_for?: string | null
          service_mode: string
          status?: string
          tax_category?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_code?: string | null
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          estimated_cost?: number | null
          external_provider_id?: string | null
          external_provider_meta?: Json | null
          external_provider_name?: string | null
          financial_category?: string | null
          horse_id?: string
          id?: string
          internal_resource_ref?: Json | null
          is_income?: boolean
          notes?: string | null
          order_type_id?: string
          priority?: string
          requested_at?: string
          scheduled_for?: string | null
          service_mode?: string
          status?: string
          tax_category?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_orders_external_provider_id_fkey"
            columns: ["external_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_orders_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_orders_order_type_id_fkey"
            columns: ["order_type_id"]
            isOneToOne: false
            referencedRelation: "horse_order_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_owners: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          name_ar: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          name_ar?: string | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_owners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_owners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_ownership: {
        Row: {
          created_at: string
          horse_id: string
          id: string
          is_primary: boolean
          owner_id: string
          ownership_percentage: number
        }
        Insert: {
          created_at?: string
          horse_id: string
          id?: string
          is_primary?: boolean
          owner_id: string
          ownership_percentage: number
        }
        Update: {
          created_at?: string
          horse_id?: string
          id?: string
          is_primary?: boolean
          owner_id?: string
          ownership_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "horse_ownership_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_ownership_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "horse_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_ownership_history: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          effective_date: string | null
          horse_id: string
          id: string
          is_primary: boolean
          notes: string | null
          owner_id: string
          ownership_percentage: number
          previous_percentage: number | null
          transfer_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          effective_date?: string | null
          horse_id: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          owner_id: string
          ownership_percentage: number
          previous_percentage?: number | null
          transfer_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          effective_date?: string | null
          horse_id?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          owner_id?: string
          ownership_percentage?: number
          previous_percentage?: number | null
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_ownership_history_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_ownership_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "horse_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_vaccinations: {
        Row: {
          administered_by: string | null
          administered_date: string | null
          created_at: string
          due_date: string
          external_provider_id: string | null
          horse_id: string
          id: string
          notes: string | null
          program_id: string
          service_mode: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          administered_by?: string | null
          administered_date?: string | null
          created_at?: string
          due_date: string
          external_provider_id?: string | null
          horse_id: string
          id?: string
          notes?: string | null
          program_id: string
          service_mode?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          administered_by?: string | null
          administered_date?: string | null
          created_at?: string
          due_date?: string
          external_provider_id?: string | null
          horse_id?: string
          id?: string
          notes?: string | null
          program_id?: string
          service_mode?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_vaccinations_administered_by_fkey"
            columns: ["administered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_external_provider_id_fkey"
            columns: ["external_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vaccination_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      horses: {
        Row: {
          age_category: string | null
          avatar_url: string | null
          birth_at: string | null
          birth_date: string | null
          body_marks: string | null
          branch_id: string | null
          breed: string | null
          breed_id: string | null
          breeder_id: string | null
          breeding_role: string | null
          color: string | null
          color_id: string | null
          created_at: string
          distinctive_marks_notes: string | null
          external_links: string[] | null
          father_id: string | null
          father_name: string | null
          father_name_ar: string | null
          gender: string
          height: number | null
          housing_notes: string | null
          housing_unit_id: string | null
          id: string
          images: string[] | null
          is_gelded: boolean
          is_pregnant: boolean
          legs_marks: string | null
          mane_marks: string | null
          maternal_grandfather: string | null
          maternal_grandmother: string | null
          microchip_number: string | null
          mother_id: string | null
          mother_name: string | null
          mother_name_ar: string | null
          name: string
          name_ar: string | null
          notes: string | null
          passport_number: string | null
          paternal_grandfather: string | null
          paternal_grandmother: string | null
          pregnancy_months: number | null
          registration_number: string | null
          stable_id: string | null
          status: string
          tenant_id: string
          ueln: string | null
          updated_at: string
          videos: string[] | null
          weight: number | null
        }
        Insert: {
          age_category?: string | null
          avatar_url?: string | null
          birth_at?: string | null
          birth_date?: string | null
          body_marks?: string | null
          branch_id?: string | null
          breed?: string | null
          breed_id?: string | null
          breeder_id?: string | null
          breeding_role?: string | null
          color?: string | null
          color_id?: string | null
          created_at?: string
          distinctive_marks_notes?: string | null
          external_links?: string[] | null
          father_id?: string | null
          father_name?: string | null
          father_name_ar?: string | null
          gender: string
          height?: number | null
          housing_notes?: string | null
          housing_unit_id?: string | null
          id?: string
          images?: string[] | null
          is_gelded?: boolean
          is_pregnant?: boolean
          legs_marks?: string | null
          mane_marks?: string | null
          maternal_grandfather?: string | null
          maternal_grandmother?: string | null
          microchip_number?: string | null
          mother_id?: string | null
          mother_name?: string | null
          mother_name_ar?: string | null
          name: string
          name_ar?: string | null
          notes?: string | null
          passport_number?: string | null
          paternal_grandfather?: string | null
          paternal_grandmother?: string | null
          pregnancy_months?: number | null
          registration_number?: string | null
          stable_id?: string | null
          status?: string
          tenant_id: string
          ueln?: string | null
          updated_at?: string
          videos?: string[] | null
          weight?: number | null
        }
        Update: {
          age_category?: string | null
          avatar_url?: string | null
          birth_at?: string | null
          birth_date?: string | null
          body_marks?: string | null
          branch_id?: string | null
          breed?: string | null
          breed_id?: string | null
          breeder_id?: string | null
          breeding_role?: string | null
          color?: string | null
          color_id?: string | null
          created_at?: string
          distinctive_marks_notes?: string | null
          external_links?: string[] | null
          father_id?: string | null
          father_name?: string | null
          father_name_ar?: string | null
          gender?: string
          height?: number | null
          housing_notes?: string | null
          housing_unit_id?: string | null
          id?: string
          images?: string[] | null
          is_gelded?: boolean
          is_pregnant?: boolean
          legs_marks?: string | null
          mane_marks?: string | null
          maternal_grandfather?: string | null
          maternal_grandmother?: string | null
          microchip_number?: string | null
          mother_id?: string | null
          mother_name?: string | null
          mother_name_ar?: string | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          passport_number?: string | null
          paternal_grandfather?: string | null
          paternal_grandmother?: string | null
          pregnancy_months?: number | null
          registration_number?: string | null
          stable_id?: string | null
          status?: string
          tenant_id?: string
          ueln?: string | null
          updated_at?: string
          videos?: string[] | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "horses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_breed_id_fkey"
            columns: ["breed_id"]
            isOneToOne: false
            referencedRelation: "horse_breeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_breeder_id_fkey"
            columns: ["breeder_id"]
            isOneToOne: false
            referencedRelation: "breeders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "horse_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_housing_unit_id_fkey"
            columns: ["housing_unit_id"]
            isOneToOne: false
            referencedRelation: "housing_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_stable_id_fkey"
            columns: ["stable_id"]
            isOneToOne: false
            referencedRelation: "stables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_units: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          id: string
          notes: string | null
          stable_id: string | null
          status: string
          tenant_id: string
          unit_type: string
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          id?: string
          notes?: string | null
          stable_id?: string | null
          status?: string
          tenant_id: string
          unit_type?: string
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          id?: string
          notes?: string | null
          stable_id?: string | null
          status?: string
          tenant_id?: string
          unit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "housing_units_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_units_stable_id_fkey"
            columns: ["stable_id"]
            isOneToOne: false
            referencedRelation: "stables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          assigned_horse_ids: string[] | null
          created_at: string
          horses_accepted: boolean | null
          id: string
          invitee_email: string
          invitee_id: string | null
          proposed_role: Database["public"]["Enums"]["tenant_role"]
          rejection_reason: string | null
          responded_at: string | null
          role_accepted: boolean | null
          sender_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_horse_ids?: string[] | null
          created_at?: string
          horses_accepted?: boolean | null
          id?: string
          invitee_email: string
          invitee_id?: string | null
          proposed_role: Database["public"]["Enums"]["tenant_role"]
          rejection_reason?: string | null
          responded_at?: string | null
          role_accepted?: boolean | null
          sender_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_horse_ids?: string[] | null
          created_at?: string
          horses_accepted?: boolean | null
          id?: string
          invitee_email?: string
          invitee_id?: string | null
          proposed_role?: Database["public"]["Enums"]["tenant_role"]
          rejection_reason?: string | null
          responded_at?: string | null
          role_accepted?: boolean | null
          sender_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_credit_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          sample_ref: string | null
          samples_count: number
          tenant_id: string
          txn_type: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          sample_ref?: string | null
          samples_count: number
          tenant_id: string
          txn_type: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          sample_ref?: string | null
          samples_count?: number
          tenant_id?: string
          txn_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_credit_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_credit_transactions_sample_ref_fkey"
            columns: ["sample_ref"]
            isOneToOne: false
            referencedRelation: "lab_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_credit_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_credit_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_credit_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "lab_credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_credit_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_credit_wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_credit_wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_events: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          event_type: string
          from_status: string | null
          id: string
          payload: Json | null
          tenant_id: string
          to_status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          from_status?: string | null
          id?: string
          payload?: Json | null
          tenant_id: string
          to_status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          from_status?: string | null
          id?: string
          payload?: Json | null
          tenant_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_result_shares: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          result_id: string
          revoked_at: string | null
          share_token: string
          tenant_id: string
          use_alias: boolean
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          result_id: string
          revoked_at?: string | null
          share_token?: string
          tenant_id: string
          use_alias?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          result_id?: string
          revoked_at?: string | null
          share_token?: string
          tenant_id?: string
          use_alias?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lab_result_shares_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_result_shares_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_result_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_result_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          created_at: string
          created_by: string
          flags: string | null
          id: string
          interpretation: Json | null
          result_data: Json
          reviewed_by: string | null
          sample_id: string
          status: string
          template_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          flags?: string | null
          id?: string
          interpretation?: Json | null
          result_data?: Json
          reviewed_by?: string | null
          sample_id: string
          status?: string
          template_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          flags?: string | null
          id?: string
          interpretation?: Json | null
          result_data?: Json
          reviewed_by?: string | null
          sample_id?: string
          status?: string
          template_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "lab_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lab_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_sample_templates: {
        Row: {
          created_at: string
          id: string
          sample_id: string
          sort_order: number | null
          template_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sample_id: string
          sort_order?: number | null
          template_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sample_id?: string
          sort_order?: number | null
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_sample_templates_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "lab_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sample_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lab_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sample_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sample_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_sample_test_types: {
        Row: {
          created_at: string
          id: string
          sample_id: string
          tenant_id: string
          test_type_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sample_id: string
          tenant_id: string
          test_type_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sample_id?: string
          tenant_id?: string
          test_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_sample_test_types_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "lab_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sample_test_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sample_test_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sample_test_types_test_type_id_fkey"
            columns: ["test_type_id"]
            isOneToOne: false
            referencedRelation: "lab_test_types"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_samples: {
        Row: {
          accessioned_at: string | null
          assigned_to: string | null
          client_id: string | null
          collection_date: string
          completed_at: string | null
          created_at: string
          created_by: string
          debit_txn_id: string | null
          horse_id: string
          id: string
          metadata: Json | null
          notes: string | null
          physical_sample_id: string | null
          received_at: string | null
          received_by: string | null
          related_order_id: string | null
          retest_count: number
          retest_of_sample_id: string | null
          source_lab_tenant_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accessioned_at?: string | null
          assigned_to?: string | null
          client_id?: string | null
          collection_date?: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          debit_txn_id?: string | null
          horse_id: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          physical_sample_id?: string | null
          received_at?: string | null
          received_by?: string | null
          related_order_id?: string | null
          retest_count?: number
          retest_of_sample_id?: string | null
          source_lab_tenant_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accessioned_at?: string | null
          assigned_to?: string | null
          client_id?: string | null
          collection_date?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          debit_txn_id?: string | null
          horse_id?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          physical_sample_id?: string | null
          received_at?: string | null
          received_by?: string | null
          related_order_id?: string | null
          retest_count?: number
          retest_of_sample_id?: string | null
          source_lab_tenant_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_samples_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_debit_txn_fkey"
            columns: ["debit_txn_id"]
            isOneToOne: false
            referencedRelation: "lab_credit_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "horse_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_retest_of_sample_id_fkey"
            columns: ["retest_of_sample_id"]
            isOneToOne: false
            referencedRelation: "lab_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_source_lab_tenant_id_fkey"
            columns: ["source_lab_tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_source_lab_tenant_id_fkey"
            columns: ["source_lab_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_templates: {
        Row: {
          category: string | null
          created_at: string
          diagnostic_rules: Json | null
          fields: Json
          groups: Json | null
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          normal_ranges: Json | null
          pricing: Json | null
          template_type: string
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          diagnostic_rules?: Json | null
          fields?: Json
          groups?: Json | null
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          normal_ranges?: Json | null
          pricing?: Json | null
          template_type?: string
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          diagnostic_rules?: Json | null
          fields?: Json
          groups?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          normal_ranges?: Json | null
          pricing?: Json | null
          template_type?: string
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_test_types: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          pin_as_tab: boolean
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          pin_as_tab?: boolean
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          pin_as_tab?: boolean
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_test_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_test_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          owner_type: Database["public"]["Enums"]["payment_owner_type"]
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          owner_type: Database["public"]["Enums"]["payment_owner_type"]
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          owner_type?: Database["public"]["Enums"]["payment_owner_type"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount_display: string | null
          created_at: string
          currency: string
          id: string
          intent_type: Database["public"]["Enums"]["payment_intent_type"]
          payee_account_id: string
          payer_user_id: string
          reference_id: string
          reference_type: Database["public"]["Enums"]["payment_reference_type"]
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount_display?: string | null
          created_at?: string
          currency?: string
          id?: string
          intent_type: Database["public"]["Enums"]["payment_intent_type"]
          payee_account_id: string
          payer_user_id: string
          reference_id: string
          reference_type: Database["public"]["Enums"]["payment_reference_type"]
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_display?: string | null
          created_at?: string
          currency?: string
          id?: string
          intent_type?: Database["public"]["Enums"]["payment_intent_type"]
          payee_account_id?: string
          payer_user_id?: string
          reference_id?: string
          reference_type?: Database["public"]["Enums"]["payment_reference_type"]
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_payee_account_id_fkey"
            columns: ["payee_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_splits: {
        Row: {
          amount_display: string | null
          created_at: string
          id: string
          payment_intent_id: string
          receiver_account_id: string
          role: Database["public"]["Enums"]["payment_split_role"]
        }
        Insert: {
          amount_display?: string | null
          created_at?: string
          id?: string
          payment_intent_id: string
          receiver_account_id: string
          role: Database["public"]["Enums"]["payment_split_role"]
        }
        Update: {
          amount_display?: string | null
          created_at?: string
          id?: string
          payment_intent_id?: string
          receiver_account_id?: string
          role?: Database["public"]["Enums"]["payment_split_role"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_splits_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_splits_receiver_account_id_fkey"
            columns: ["receiver_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          media_urls: string[] | null
          updated_at: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          media_urls?: string[] | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          media_urls?: string[] | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pregnancies: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          end_reason: string | null
          ended_at: string | null
          expected_due_date: string | null
          id: string
          mare_id: string
          notes: string | null
          source_attempt_id: string | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
          verification_state: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          end_reason?: string | null
          ended_at?: string | null
          expected_due_date?: string | null
          id?: string
          mare_id: string
          notes?: string | null
          source_attempt_id?: string | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
          verification_state?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          end_reason?: string | null
          ended_at?: string | null
          expected_due_date?: string | null
          id?: string
          mare_id?: string
          notes?: string | null
          source_attempt_id?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          verification_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "pregnancies_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_mare_id_fkey"
            columns: ["mare_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_source_attempt_id_fkey"
            columns: ["source_attempt_id"]
            isOneToOne: false
            referencedRelation: "breeding_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pregnancy_checks: {
        Row: {
          check_date: string
          created_at: string
          created_by: string
          id: string
          method: string
          notes: string | null
          outcome: string
          pregnancy_id: string
          tenant_id: string
        }
        Insert: {
          check_date: string
          created_at?: string
          created_by: string
          id?: string
          method: string
          notes?: string | null
          outcome: string
          pregnancy_id: string
          tenant_id: string
        }
        Update: {
          check_date?: string
          created_at?: string
          created_by?: string
          id?: string
          method?: string
          notes?: string | null
          outcome?: string
          pregnancy_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pregnancy_checks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_checks_pregnancy_id_fkey"
            columns: ["pregnancy_id"]
            isOneToOne: false
            referencedRelation: "pregnancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          social_links: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          location?: string | null
          phone?: string | null
          social_links?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          social_links?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      semen_batches: {
        Row: {
          collection_date: string
          created_at: string
          doses_available: number
          doses_total: number
          id: string
          quality_notes: string | null
          stallion_id: string
          tank_id: string | null
          tenant_id: string
          type: string
          unit: string
          updated_at: string
        }
        Insert: {
          collection_date: string
          created_at?: string
          doses_available: number
          doses_total: number
          id?: string
          quality_notes?: string | null
          stallion_id: string
          tank_id?: string | null
          tenant_id: string
          type: string
          unit?: string
          updated_at?: string
        }
        Update: {
          collection_date?: string
          created_at?: string
          doses_available?: number
          doses_total?: number
          id?: string
          quality_notes?: string | null
          stallion_id?: string
          tank_id?: string | null
          tenant_id?: string
          type?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "semen_batches_stallion_id_fkey"
            columns: ["stallion_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semen_batches_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "semen_tanks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semen_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semen_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      semen_tanks: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "semen_tanks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semen_tanks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          address: string | null
          average_cost: number | null
          business_hours: Json | null
          certifications: string[] | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          emergency_phone: string | null
          estimated_response_time: string | null
          id: string
          is_emergency_provider: boolean
          name: string
          name_ar: string | null
          notes: string | null
          rating: number | null
          review_count: number | null
          services: string[] | null
          specializations: string[] | null
          status: string
          tenant_id: string
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          average_cost?: number | null
          business_hours?: Json | null
          certifications?: string[] | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          emergency_phone?: string | null
          estimated_response_time?: string | null
          id?: string
          is_emergency_provider?: boolean
          name: string
          name_ar?: string | null
          notes?: string | null
          rating?: number | null
          review_count?: number | null
          services?: string[] | null
          specializations?: string[] | null
          status?: string
          tenant_id: string
          type: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          average_cost?: number | null
          business_hours?: Json | null
          certifications?: string[] | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          emergency_phone?: string | null
          estimated_response_time?: string | null
          id?: string
          is_emergency_provider?: boolean
          name?: string
          name_ar?: string | null
          notes?: string | null
          rating?: number | null
          review_count?: number | null
          services?: string[] | null
          specializations?: string[] | null
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stables: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_capabilities: {
        Row: {
          allow_external: boolean
          category: string
          config: Json | null
          created_at: string
          has_internal: boolean
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_external?: boolean
          category: string
          config?: Json | null
          created_at?: string
          has_internal?: boolean
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_external?: boolean
          category?: string
          config?: Json | null
          created_at?: string
          has_internal?: boolean
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_capabilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_capabilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          can_invite: boolean
          can_manage_horses: boolean
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_invite?: boolean
          can_manage_horses?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_invite?: boolean
          can_manage_horses?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          price_display: string | null
          service_type: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          price_display?: string | null
          service_type?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          price_display?: string | null
          service_type?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_listed: boolean | null
          is_public: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          public_description: string | null
          public_email: string | null
          public_location_text: string | null
          public_name: string | null
          public_phone: string | null
          public_website: string | null
          region: string | null
          slug: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["tenant_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_listed?: boolean | null
          is_public?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          public_description?: string | null
          public_email?: string | null
          public_location_text?: string | null
          public_name?: string | null
          public_phone?: string | null
          public_website?: string | null
          region?: string | null
          slug?: string | null
          tags?: string[] | null
          type: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_listed?: boolean | null
          is_public?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          public_description?: string | null
          public_email?: string | null
          public_location_text?: string | null
          public_name?: string | null
          public_phone?: string | null
          public_website?: string | null
          region?: string | null
          slug?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Relationships: []
      }
      vaccination_programs: {
        Row: {
          age_min_days: number | null
          created_at: string
          default_interval_days: number | null
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          age_min_days?: number | null
          created_at?: string
          default_interval_days?: number | null
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          age_min_days?: number | null
          created_at?: string
          default_interval_days?: number | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_events: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          event_type: string
          from_status: string | null
          id: string
          payload: Json | null
          tenant_id: string
          to_status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          from_status?: string | null
          id?: string
          payload?: Json | null
          tenant_id: string
          to_status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          from_status?: string | null
          id?: string
          payload?: Json | null
          tenant_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vet_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_followups: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          due_at: string
          id: string
          notes: string | null
          status: string
          tenant_id: string
          treatment_id: string
          type: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          due_at: string
          id?: string
          notes?: string | null
          status?: string
          tenant_id: string
          treatment_id: string
          type: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          due_at?: string
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string
          treatment_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_followups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_followups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_followups_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "vet_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_medications: {
        Row: {
          created_at: string
          dose: string | null
          duration_days: number | null
          end_date: string | null
          frequency: string | null
          id: string
          name: string
          notes: string | null
          start_date: string | null
          tenant_id: string
          treatment_id: string
        }
        Insert: {
          created_at?: string
          dose?: string | null
          duration_days?: number | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          tenant_id: string
          treatment_id: string
        }
        Update: {
          created_at?: string
          dose?: string | null
          duration_days?: number | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          tenant_id?: string
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_medications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_medications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_medications_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "vet_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_treatments: {
        Row: {
          assigned_to: string | null
          category: string
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          external_provider_id: string | null
          external_provider_name: string | null
          horse_id: string
          id: string
          internal_resource_ref: Json | null
          notes: string | null
          priority: string
          related_order_id: string | null
          requested_at: string
          scheduled_for: string | null
          service_mode: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          external_provider_id?: string | null
          external_provider_name?: string | null
          horse_id: string
          id?: string
          internal_resource_ref?: Json | null
          notes?: string | null
          priority?: string
          related_order_id?: string | null
          requested_at?: string
          scheduled_for?: string | null
          service_mode?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          external_provider_id?: string | null
          external_provider_name?: string | null
          horse_id?: string
          id?: string
          internal_resource_ref?: Json | null
          notes?: string | null
          priority?: string
          related_order_id?: string | null
          requested_at?: string
          scheduled_for?: string | null
          service_mode?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_treatments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_treatments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_treatments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_treatments_external_provider_id_fkey"
            columns: ["external_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_treatments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_treatments_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "horse_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_treatments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_treatments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      academy_booking_consumption: {
        Row: {
          confirmed_bookings: number | null
          month: string | null
          tenant_id: string | null
          total_bookings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_tenant_directory: {
        Row: {
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_listed: boolean | null
          logo_url: string | null
          public_description: string | null
          public_location_text: string | null
          region: string | null
          slug: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["tenant_type"] | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          display_name?: never
          id?: string | null
          is_listed?: boolean | null
          logo_url?: string | null
          public_description?: string | null
          public_location_text?: string | null
          region?: string | null
          slug?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["tenant_type"] | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          display_name?: never
          id?: string | null
          is_listed?: boolean | null
          logo_url?: string | null
          public_description?: string | null
          public_location_text?: string | null
          region?: string | null
          slug?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["tenant_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_invite_in_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_academy_sessions: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_horses: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_lab: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_orders: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_tenant_services: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_payment_account: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_payment_intent: {
        Args: { _intent_id: string; _user_id: string }
        Returns: boolean
      }
      generate_unique_slug: { Args: { base_name: string }; Returns: string }
      get_horse_display_name: {
        Args: { _horse_id: string; _use_alias?: boolean }
        Returns: string
      }
      get_public_tenant: {
        Args: { tenant_slug: string }
        Returns: {
          cover_url: string
          created_at: string
          display_name: string
          id: string
          logo_url: string
          public_description: string
          public_email: string
          public_location_text: string
          public_phone: string
          public_website: string
          region: string
          slug: string
          tags: string[]
          type: Database["public"]["Enums"]["tenant_type"]
        }[]
      }
      get_riyadh_day_bounds: {
        Args: { _day?: string }
        Returns: {
          end_utc: string
          start_utc: string
        }[]
      }
      get_shared_lab_result: {
        Args: { _share_token: string }
        Returns: {
          created_at: string
          flags: string
          horse_display_name: string
          interpretation: Json
          result_data: Json
          result_id: string
          status: string
          template_name: string
          tenant_display_name: string
        }[]
      }
      has_internal_capability: {
        Args: { _category: string; _tenant_id: string }
        Returns: boolean
      }
      has_lab_feature: {
        Args: { _feature: string; _tenant_id: string }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["tenant_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_following: {
        Args: { _follower_id: string; _following_id: string }
        Returns: boolean
      }
      is_lab_credits_enabled: { Args: { _tenant_id: string }; Returns: boolean }
      is_slug_available: {
        Args: { check_slug: string; exclude_tenant_id?: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      invitation_status: "pending" | "accepted" | "rejected"
      payment_intent_type: "platform_fee" | "service_payment" | "commission"
      payment_owner_type: "platform" | "tenant"
      payment_reference_type:
        | "academy_booking"
        | "service"
        | "order"
        | "auction"
        | "subscription"
      payment_split_role: "platform" | "tenant"
      payment_status: "draft" | "pending" | "paid" | "cancelled"
      post_visibility: "public" | "private" | "followers"
      tenant_role:
        | "owner"
        | "admin"
        | "foreman"
        | "vet"
        | "trainer"
        | "employee"
        | "manager"
      tenant_type:
        | "stable"
        | "clinic"
        | "lab"
        | "academy"
        | "pharmacy"
        | "transport"
        | "auction"
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
      invitation_status: ["pending", "accepted", "rejected"],
      payment_intent_type: ["platform_fee", "service_payment", "commission"],
      payment_owner_type: ["platform", "tenant"],
      payment_reference_type: [
        "academy_booking",
        "service",
        "order",
        "auction",
        "subscription",
      ],
      payment_split_role: ["platform", "tenant"],
      payment_status: ["draft", "pending", "paid", "cancelled"],
      post_visibility: ["public", "private", "followers"],
      tenant_role: [
        "owner",
        "admin",
        "foreman",
        "vet",
        "trainer",
        "employee",
        "manager",
      ],
      tenant_type: [
        "stable",
        "clinic",
        "lab",
        "academy",
        "pharmacy",
        "transport",
        "auction",
      ],
    },
  },
} as const
