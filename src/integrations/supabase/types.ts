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
      horses: {
        Row: {
          age_category: string | null
          avatar_url: string | null
          birth_date: string | null
          body_marks: string | null
          branch_id: string | null
          breed: string | null
          breed_id: string | null
          breeder_id: string | null
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
          weight: number | null
        }
        Insert: {
          age_category?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          body_marks?: string | null
          branch_id?: string | null
          breed?: string | null
          breed_id?: string | null
          breeder_id?: string | null
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
          weight?: number | null
        }
        Update: {
          age_category?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          body_marks?: string | null
          branch_id?: string | null
          breed?: string | null
          breed_id?: string | null
          breeder_id?: string | null
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
