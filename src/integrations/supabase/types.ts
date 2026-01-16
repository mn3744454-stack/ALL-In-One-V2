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
      billing_links: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          link_kind: string
          source_id: string
          source_type: string
          tenant_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          link_kind: string
          source_id: string
          source_type: string
          tenant_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          link_kind?: string
          source_id?: string
          source_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_links_tenant_id_fkey"
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
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          is_demo: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
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
      bundle_permissions: {
        Row: {
          bundle_id: string
          permission_key: string
        }
        Insert: {
          bundle_id: string
          permission_key: string
        }
        Update: {
          bundle_id?: string
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_permissions_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "permission_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permission_definitions"
            referencedColumns: ["key"]
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
      customer_balances: {
        Row: {
          balance: number
          client_id: string
          currency: string | null
          id: string
          last_updated: string | null
          tenant_id: string
        }
        Insert: {
          balance?: number
          client_id: string
          currency?: string | null
          id?: string
          last_updated?: string | null
          tenant_id: string
        }
        Update: {
          balance?: number
          client_id?: string
          currency?: string | null
          id?: string
          last_updated?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_balances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_audit_log: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          permission_key: string
          target_member_id: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          permission_key: string
          target_member_id: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          permission_key?: string
          target_member_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegation_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_audit_log_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "tenant_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_scopes: {
        Row: {
          can_delegate: boolean
          created_at: string
          created_by: string | null
          grantor_member_id: string
          id: string
          permission_key: string
          tenant_id: string
        }
        Insert: {
          can_delegate?: boolean
          created_at?: string
          created_by?: string | null
          grantor_member_id: string
          id?: string
          permission_key: string
          tenant_id: string
        }
        Update: {
          can_delegate?: boolean
          created_at?: string
          created_by?: string | null
          grantor_member_id?: string
          id?: string
          permission_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegation_scopes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_scopes_grantor_member_id_fkey"
            columns: ["grantor_member_id"]
            isOneToOne: false
            referencedRelation: "tenant_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_scopes_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permission_definitions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "delegation_scopes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_scopes_tenant_id_fkey"
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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          expense_date: string
          id: string
          notes: string | null
          receipt_asset_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_asset_id?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_asset_id?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_receipt_asset_id_fkey"
            columns: ["receipt_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_areas: {
        Row: {
          branch_id: string
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean | null
          name: string
          name_ar: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean | null
          name: string
          name_ar?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean | null
          name?: string
          name_ar?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_areas_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_areas_tenant_id_fkey"
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
      horse_movements: {
        Row: {
          created_at: string
          from_area_id: string | null
          from_location_id: string | null
          from_unit_id: string | null
          horse_id: string
          id: string
          internal_location_note: string | null
          is_demo: boolean
          movement_at: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          reason: string | null
          recorded_by: string | null
          tenant_id: string
          to_area_id: string | null
          to_location_id: string | null
          to_unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_area_id?: string | null
          from_location_id?: string | null
          from_unit_id?: string | null
          horse_id: string
          id?: string
          internal_location_note?: string | null
          is_demo?: boolean
          movement_at?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          reason?: string | null
          recorded_by?: string | null
          tenant_id: string
          to_area_id?: string | null
          to_location_id?: string | null
          to_unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_area_id?: string | null
          from_location_id?: string | null
          from_unit_id?: string | null
          horse_id?: string
          id?: string
          internal_location_note?: string | null
          is_demo?: boolean
          movement_at?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          reason?: string | null
          recorded_by?: string | null
          tenant_id?: string
          to_area_id?: string | null
          to_location_id?: string | null
          to_unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_movements_from_area_id_fkey"
            columns: ["from_area_id"]
            isOneToOne: false
            referencedRelation: "facility_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_movements_from_unit_id_fkey"
            columns: ["from_unit_id"]
            isOneToOne: false
            referencedRelation: "housing_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_movements_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_movements_to_area_id_fkey"
            columns: ["to_area_id"]
            isOneToOne: false
            referencedRelation: "facility_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_movements_to_unit_id_fkey"
            columns: ["to_unit_id"]
            isOneToOne: false
            referencedRelation: "housing_units"
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
          current_area_id: string | null
          current_location_id: string | null
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
          current_area_id?: string | null
          current_location_id?: string | null
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
          current_area_id?: string | null
          current_location_id?: string | null
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
            foreignKeyName: "horses_current_area_id_fkey"
            columns: ["current_area_id"]
            isOneToOne: false
            referencedRelation: "facility_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
      housing_unit_occupants: {
        Row: {
          created_at: string | null
          horse_id: string
          id: string
          is_demo: boolean | null
          since: string | null
          tenant_id: string
          unit_id: string
          until: string | null
        }
        Insert: {
          created_at?: string | null
          horse_id: string
          id?: string
          is_demo?: boolean | null
          since?: string | null
          tenant_id: string
          unit_id: string
          until?: string | null
        }
        Update: {
          created_at?: string | null
          horse_id?: string
          id?: string
          is_demo?: boolean | null
          since?: string | null
          tenant_id?: string
          unit_id?: string
          until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housing_unit_occupants_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_unit_occupants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_unit_occupants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_unit_occupants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "housing_units"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_units: {
        Row: {
          area_id: string | null
          branch_id: string | null
          capacity: number
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          is_demo: boolean | null
          name: string | null
          name_ar: string | null
          notes: string | null
          occupancy: Database["public"]["Enums"]["occupancy_mode"]
          stable_id: string | null
          status: string
          tenant_id: string
          unit_type: string
          updated_at: string | null
        }
        Insert: {
          area_id?: string | null
          branch_id?: string | null
          capacity?: number
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_demo?: boolean | null
          name?: string | null
          name_ar?: string | null
          notes?: string | null
          occupancy?: Database["public"]["Enums"]["occupancy_mode"]
          stable_id?: string | null
          status?: string
          tenant_id: string
          unit_type?: string
          updated_at?: string | null
        }
        Update: {
          area_id?: string | null
          branch_id?: string | null
          capacity?: number
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_demo?: boolean | null
          name?: string | null
          name_ar?: string | null
          notes?: string | null
          occupancy?: Database["public"]["Enums"]["occupancy_mode"]
          stable_id?: string | null
          status?: string
          tenant_id?: string
          unit_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housing_units_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "facility_areas"
            referencedColumns: ["id"]
          },
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
      hr_assignments: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string | null
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          role: string
          start_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date?: string | null
          entity_id: string
          entity_type?: string
          id?: string
          notes?: string | null
          role: string
          start_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          role?: string
          start_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          created_at: string
          created_by: string | null
          custom_fields: Json
          department: string | null
          email: string | null
          employee_category:
            | Database["public"]["Enums"]["hr_employee_category"]
            | null
          employee_type: Database["public"]["Enums"]["hr_employee_type"]
          employee_type_custom: string | null
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          notes: string | null
          phone: string | null
          tags: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          department?: string | null
          email?: string | null
          employee_category?:
            | Database["public"]["Enums"]["hr_employee_category"]
            | null
          employee_type?: Database["public"]["Enums"]["hr_employee_type"]
          employee_type_custom?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          department?: string | null
          email?: string | null
          employee_category?:
            | Database["public"]["Enums"]["hr_employee_category"]
            | null
          employee_type?: Database["public"]["Enums"]["hr_employee_type"]
          employee_type_custom?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_settings: {
        Row: {
          created_at: string
          enabled_modules: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled_modules?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled_modules?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          total_cost: number | null
          unit_cost: number | null
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          total_cost?: number | null
          unit_cost?: number | null
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          total_cost?: number | null
          unit_cost?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          assigned_horse_ids: string[] | null
          created_at: string
          horses_accepted: boolean | null
          id: string
          invitee_email: string
          invitee_id: string | null
          preaccepted_at: string | null
          proposed_role: Database["public"]["Enums"]["tenant_role"]
          rejection_reason: string | null
          responded_at: string | null
          role_accepted: boolean | null
          sender_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_horse_ids?: string[] | null
          created_at?: string
          horses_accepted?: boolean | null
          id?: string
          invitee_email: string
          invitee_id?: string | null
          preaccepted_at?: string | null
          proposed_role: Database["public"]["Enums"]["tenant_role"]
          rejection_reason?: string | null
          responded_at?: string | null
          role_accepted?: boolean | null
          sender_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_horse_ids?: string[] | null
          created_at?: string
          horses_accepted?: boolean | null
          id?: string
          invitee_email?: string
          invitee_id?: string | null
          preaccepted_at?: string | null
          proposed_role?: Database["public"]["Enums"]["tenant_role"]
          rejection_reason?: string | null
          responded_at?: string | null
          role_accepted?: boolean | null
          sender_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string
          token?: string
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
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          invoice_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          invoice_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          invoice_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          branch_id: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          discount_amount: number | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          payment_method: string | null
          payment_received_at: string | null
          pos_session_id: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          payment_method?: string | null
          payment_received_at?: string | null
          pos_session_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tenant_id: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          payment_method?: string | null
          payment_received_at?: string | null
          pos_session_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
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
      lab_requests: {
        Row: {
          created_at: string | null
          created_by: string
          expected_by: string | null
          external_lab_id: string | null
          external_lab_name: string | null
          horse_id: string
          id: string
          is_demo: boolean | null
          notes: string | null
          priority: string
          received_at: string | null
          requested_at: string
          result_file_path: string | null
          result_share_token: string | null
          result_url: string | null
          status: string
          tenant_id: string
          test_description: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expected_by?: string | null
          external_lab_id?: string | null
          external_lab_name?: string | null
          horse_id: string
          id?: string
          is_demo?: boolean | null
          notes?: string | null
          priority?: string
          received_at?: string | null
          requested_at?: string
          result_file_path?: string | null
          result_share_token?: string | null
          result_url?: string | null
          status?: string
          tenant_id: string
          test_description: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expected_by?: string | null
          external_lab_id?: string | null
          external_lab_name?: string | null
          horse_id?: string
          id?: string
          is_demo?: boolean | null
          notes?: string | null
          priority?: string
          received_at?: string | null
          requested_at?: string
          result_file_path?: string | null
          result_share_token?: string | null
          result_url?: string | null
          status?: string
          tenant_id?: string
          test_description?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_requests_external_lab_id_fkey"
            columns: ["external_lab_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_requests_external_lab_id_fkey"
            columns: ["external_lab_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_requests_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_requests_tenant_id_fkey"
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
          collection_date_only: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          daily_number: number | null
          debit_txn_id: string | null
          horse_external_id: string | null
          horse_id: string | null
          horse_metadata: Json | null
          horse_name: string | null
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
          collection_date_only?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          daily_number?: number | null
          debit_txn_id?: string | null
          horse_external_id?: string | null
          horse_id?: string | null
          horse_metadata?: Json | null
          horse_name?: string | null
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
          collection_date_only?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          daily_number?: number | null
          debit_txn_id?: string | null
          horse_external_id?: string | null
          horse_id?: string | null
          horse_metadata?: Json | null
          horse_name?: string | null
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
          category_ar: string | null
          created_at: string
          description: string | null
          description_ar: string | null
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
          category_ar?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
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
          category_ar?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
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
      ledger_entries: {
        Row: {
          amount: number
          balance_after: number
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_type: string
          id: string
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_type: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_type?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_units: {
        Row: {
          abbreviation: string
          abbreviation_ar: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          tenant_id: string
        }
        Insert: {
          abbreviation: string
          abbreviation_ar?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          tenant_id: string
        }
        Update: {
          abbreviation?: string
          abbreviation_ar?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_asset_clients: {
        Row: {
          asset_id: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          asset_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          asset_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_clients_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_asset_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_asset_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_asset_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_asset_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          bucket: string
          created_at: string | null
          created_by: string | null
          display_order: number | null
          entity_id: string
          entity_type: string
          filename: string
          id: string
          mime_type: string | null
          path: string
          size_bytes: number | null
          tenant_id: string
          visibility: string
        }
        Insert: {
          alt_text?: string | null
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          entity_id: string
          entity_type: string
          filename: string
          id?: string
          mime_type?: string | null
          path: string
          size_bytes?: number | null
          tenant_id: string
          visibility?: string
        }
        Update: {
          alt_text?: string | null
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          entity_id?: string
          entity_type?: string
          filename?: string
          id?: string
          mime_type?: string | null
          path?: string
          size_bytes?: number | null
          tenant_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_share_links: {
        Row: {
          asset_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          revoked_at: string | null
          tenant_id: string
          token: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          tenant_id: string
          token?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_share_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_share_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_share_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_share_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      member_permission_bundles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          bundle_id: string
          tenant_member_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          bundle_id: string
          tenant_member_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          bundle_id?: string
          tenant_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_permission_bundles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_permission_bundles_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "permission_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_permission_bundles_tenant_member_id_fkey"
            columns: ["tenant_member_id"]
            isOneToOne: false
            referencedRelation: "tenant_members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_permissions: {
        Row: {
          granted: boolean
          granted_at: string
          granted_by: string | null
          id: string
          permission_key: string
          tenant_member_id: string
        }
        Insert: {
          granted?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_key: string
          tenant_member_id: string
        }
        Update: {
          granted?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_key?: string
          tenant_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permission_definitions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "member_permissions_tenant_member_id_fkey"
            columns: ["tenant_member_id"]
            isOneToOne: false
            referencedRelation: "tenant_members"
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
      permission_bundles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_bundles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_bundles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_bundles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_definitions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          description_ar: string | null
          display_name: string
          is_delegatable: boolean
          key: string
          module: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          display_name: string
          is_delegatable?: boolean
          key: string
          module: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          display_name?: string
          is_delegatable?: boolean
          key?: string
          module?: string
          resource?: string
        }
        Relationships: []
      }
      pos_sessions: {
        Row: {
          branch_id: string | null
          cash_variance: number | null
          closed_at: string | null
          closed_by: string | null
          closing_cash: number | null
          created_at: string
          expected_cash: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_cash: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          cash_variance?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_cash?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          cash_variance?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_cash?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      product_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          parent_id: string | null
          sort_order: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          parent_id?: string | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          description_ar: string | null
          expiry_tracking: boolean
          id: string
          is_active: boolean
          min_stock_level: number | null
          name: string
          name_ar: string | null
          product_type: string
          purchase_price: number | null
          reorder_point: number | null
          selling_price: number | null
          sku: string | null
          supplier_id: string | null
          tax_rate: number | null
          tenant_id: string
          track_inventory: boolean
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          description_ar?: string | null
          expiry_tracking?: boolean
          id?: string
          is_active?: boolean
          min_stock_level?: number | null
          name: string
          name_ar?: string | null
          product_type?: string
          purchase_price?: number | null
          reorder_point?: number | null
          selling_price?: number | null
          sku?: string | null
          supplier_id?: string | null
          tax_rate?: number | null
          tenant_id: string
          track_inventory?: boolean
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          description_ar?: string | null
          expiry_tracking?: boolean
          id?: string
          is_active?: boolean
          min_stock_level?: number | null
          name?: string
          name_ar?: string | null
          product_type?: string
          purchase_price?: number | null
          reorder_point?: number | null
          selling_price?: number | null
          sku?: string | null
          supplier_id?: string | null
          tax_rate?: number | null
          tenant_id?: string
          track_inventory?: boolean
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
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
      public_profile_fields: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          location: string | null
          social_links: Json | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          location?: string | null
          social_links?: Json | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          social_links?: Json | null
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
      stock_levels: {
        Row: {
          available_quantity: number | null
          id: string
          last_movement_at: string | null
          product_id: string
          quantity: number
          reserved_quantity: number
          tenant_id: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          available_quantity?: number | null
          id?: string
          last_movement_at?: string | null
          product_id: string
          quantity?: number
          reserved_quantity?: number
          tenant_id: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          available_quantity?: number | null
          id?: string
          last_movement_at?: string | null
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          tenant_id?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          notes: string | null
          phone: string | null
          tax_number: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
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
      tenant_role_bundles: {
        Row: {
          bundle_id: string
          created_at: string
          created_by: string | null
          id: string
          role_key: string
          tenant_id: string
        }
        Insert: {
          bundle_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role_key: string
          tenant_id: string
        }
        Update: {
          bundle_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_role_bundles_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "permission_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_role_bundles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_role_bundles_tenant_id_role_key_fkey"
            columns: ["tenant_id", "role_key"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["tenant_id", "role_key"]
          },
        ]
      }
      tenant_role_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          granted: boolean
          id: string
          permission_key: string
          role_key: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          granted?: boolean
          id?: string
          permission_key: string
          role_key: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          granted?: boolean
          id?: string
          permission_key?: string
          role_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_role_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permission_definitions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tenant_role_permissions_tenant_id_role_key_fkey"
            columns: ["tenant_id", "role_key"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["tenant_id", "role_key"]
          },
        ]
      }
      tenant_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          is_system: boolean
          name: string
          name_ar: string | null
          role_key: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          is_system?: boolean
          name: string
          name_ar?: string | null
          role_key: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          is_system?: boolean
          name?: string
          name_ar?: string | null
          role_key?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          name_ar: string | null
          price_display: string | null
          service_type: string | null
          tenant_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          name_ar?: string | null
          price_display?: string | null
          service_type?: string | null
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          name_ar?: string | null
          price_display?: string | null
          service_type?: string | null
          tenant_id?: string
          unit_price?: number | null
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
      vet_visits: {
        Row: {
          actual_cost: number | null
          actual_date: string | null
          created_at: string | null
          created_by: string | null
          estimated_cost: number | null
          findings: string | null
          horse_ids: string[] | null
          id: string
          notes: string | null
          recommendations: string | null
          reminder_date: string | null
          reminder_sent: boolean | null
          scheduled_date: string
          scheduled_end_date: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string | null
          vet_name: string | null
          vet_phone: string | null
          vet_provider_id: string | null
          visit_type: string
        }
        Insert: {
          actual_cost?: number | null
          actual_date?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          findings?: string | null
          horse_ids?: string[] | null
          id?: string
          notes?: string | null
          recommendations?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          scheduled_date: string
          scheduled_end_date?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string | null
          vet_name?: string | null
          vet_phone?: string | null
          vet_provider_id?: string | null
          visit_type?: string
        }
        Update: {
          actual_cost?: number | null
          actual_date?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          findings?: string | null
          horse_ids?: string[] | null
          id?: string
          notes?: string | null
          recommendations?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          scheduled_date?: string
          scheduled_end_date?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          vet_name?: string | null
          vet_phone?: string | null
          vet_provider_id?: string | null
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_visits_vet_provider_id_fkey"
            columns: ["vet_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          branch_id: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          name_ar: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          name_ar?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          name_ar?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
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
      can_delegate_permission: {
        Args: { _permission_key: string; _tenant_id: string; _user_id: string }
        Returns: boolean
      }
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
      can_manage_hr: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_lab: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_movement: {
        Args: { p_tenant_id: string; user_id: string }
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
      get_media_share_info: {
        Args: { _token: string }
        Returns: {
          bucket: string
          filename: string
          mime_type: string
          path: string
        }[]
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
      get_tenant_id_from_storage_path: {
        Args: { object_path: string }
        Returns: string
      }
      has_internal_capability: {
        Args: { _category: string; _tenant_id: string }
        Returns: boolean
      }
      has_lab_feature: {
        Args: { _feature: string; _tenant_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission_key: string; _tenant_id: string; _user_id: string }
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
      initialize_tenant_defaults: {
        Args: { p_tenant_id: string; p_tenant_type: string }
        Returns: undefined
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
      record_horse_movement_with_housing: {
        Args: {
          p_clear_housing?: boolean
          p_from_area_id?: string
          p_from_location_id?: string
          p_from_unit_id?: string
          p_horse_id: string
          p_internal_location_note?: string
          p_is_demo?: boolean
          p_movement_at?: string
          p_movement_type: string
          p_notes?: string
          p_reason?: string
          p_tenant_id: string
          p_to_area_id?: string
          p_to_location_id?: string
          p_to_unit_id?: string
        }
        Returns: Json
      }
      set_tenant_role_access: {
        Args: {
          _bundle_ids: string[]
          _permission_keys: string[]
          _role_key: string
          _tenant_id: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      hr_employee_category: "field" | "office" | "mixed"
      hr_employee_type:
        | "trainer"
        | "groom"
        | "vet_tech"
        | "receptionist"
        | "lab_tech"
        | "admin"
        | "manager"
        | "driver"
        | "farrier"
        | "other"
      internal_unit_type: "stall" | "paddock" | "room" | "cage" | "other"
      invitation_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "preaccepted"
        | "expired"
        | "revoked"
      movement_type: "in" | "out" | "transfer"
      occupancy_mode: "single" | "group"
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
      hr_employee_category: ["field", "office", "mixed"],
      hr_employee_type: [
        "trainer",
        "groom",
        "vet_tech",
        "receptionist",
        "lab_tech",
        "admin",
        "manager",
        "driver",
        "farrier",
        "other",
      ],
      internal_unit_type: ["stall", "paddock", "room", "cage", "other"],
      invitation_status: [
        "pending",
        "accepted",
        "rejected",
        "preaccepted",
        "expired",
        "revoked",
      ],
      movement_type: ["in", "out", "transfer"],
      occupancy_mode: ["single", "group"],
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
