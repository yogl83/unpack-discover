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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      collaboration_hypotheses: {
        Row: {
          competency_id: string | null
          confidence_level: string | null
          created_at: string
          hypothesis_id: string
          hypothesis_status: string | null
          need_id: string
          notes: string | null
          owner_user_id: string | null
          partner_id: string
          rationale: string | null
          recommended_collaboration_format: string | null
          recommended_entry_point: string | null
          relevance_score: number | null
          title: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          competency_id?: string | null
          confidence_level?: string | null
          created_at?: string
          hypothesis_id?: string
          hypothesis_status?: string | null
          need_id: string
          notes?: string | null
          owner_user_id?: string | null
          partner_id: string
          rationale?: string | null
          recommended_collaboration_format?: string | null
          recommended_entry_point?: string | null
          relevance_score?: number | null
          title?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          competency_id?: string | null
          confidence_level?: string | null
          created_at?: string
          hypothesis_id?: string
          hypothesis_status?: string | null
          need_id?: string
          notes?: string | null
          owner_user_id?: string | null
          partner_id?: string
          rationale?: string | null
          recommended_collaboration_format?: string | null
          recommended_entry_point?: string | null
          relevance_score?: number | null
          title?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_hypotheses_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["competency_id"]
          },
          {
            foreignKeyName: "collaboration_hypotheses_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "partner_needs"
            referencedColumns: ["need_id"]
          },
          {
            foreignKeyName: "collaboration_hypotheses_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_overview"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "collaboration_hypotheses_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "collaboration_hypotheses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "miem_units"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "collaboration_hypotheses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_overview"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      competencies: {
        Row: {
          application_domain: string | null
          competency_id: string
          competency_name: string
          competency_type: string | null
          created_at: string
          description: string | null
          education_link: string | null
          evidence_of_experience: string | null
          keywords: string[] | null
          maturity_level: string | null
          methods_and_tools: string | null
          notes: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          application_domain?: string | null
          competency_id?: string
          competency_name: string
          competency_type?: string | null
          created_at?: string
          description?: string | null
          education_link?: string | null
          evidence_of_experience?: string | null
          keywords?: string[] | null
          maturity_level?: string | null
          methods_and_tools?: string | null
          notes?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          application_domain?: string | null
          competency_id?: string
          competency_name?: string
          competency_type?: string | null
          created_at?: string
          description?: string | null
          education_link?: string | null
          evidence_of_experience?: string | null
          keywords?: string[] | null
          maturity_level?: string | null
          methods_and_tools?: string | null
          notes?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "miem_units"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "competencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_overview"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_id: string
          contact_kind: string
          contact_role: string | null
          created_at: string
          department_name: string | null
          email: string | null
          full_name: string
          influence_level: string | null
          is_primary: boolean
          job_title: string | null
          last_contact_date: string | null
          last_interaction_at: string | null
          linkedin: string | null
          notes: string | null
          partner_id: string
          phone: string | null
          relationship_status: string | null
          telegram: string | null
          updated_at: string
        }
        Insert: {
          contact_id?: string
          contact_kind?: string
          contact_role?: string | null
          created_at?: string
          department_name?: string | null
          email?: string | null
          full_name: string
          influence_level?: string | null
          is_primary?: boolean
          job_title?: string | null
          last_contact_date?: string | null
          last_interaction_at?: string | null
          linkedin?: string | null
          notes?: string | null
          partner_id: string
          phone?: string | null
          relationship_status?: string | null
          telegram?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          contact_kind?: string
          contact_role?: string | null
          created_at?: string
          department_name?: string | null
          email?: string | null
          full_name?: string
          influence_level?: string | null
          is_primary?: boolean
          job_title?: string | null
          last_contact_date?: string | null
          last_interaction_at?: string | null
          linkedin?: string | null
          notes?: string | null
          partner_id?: string
          phone?: string | null
          relationship_status?: string | null
          telegram?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_overview"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      evidence: {
        Row: {
          analyst_comment: string | null
          competency_id: string | null
          confidence_level: string | null
          created_at: string
          data_collection_method: string | null
          entity_id: string
          entity_type: string
          evidence_id: string
          field_name: string | null
          field_value: string | null
          hypothesis_id: string | null
          need_id: string | null
          partner_id: string | null
          requires_interview_validation: boolean | null
          source_id: string | null
          unit_id: string | null
        }
        Insert: {
          analyst_comment?: string | null
          competency_id?: string | null
          confidence_level?: string | null
          created_at?: string
          data_collection_method?: string | null
          entity_id: string
          entity_type: string
          evidence_id?: string
          field_name?: string | null
          field_value?: string | null
          hypothesis_id?: string | null
          need_id?: string | null
          partner_id?: string | null
          requires_interview_validation?: boolean | null
          source_id?: string | null
          unit_id?: string | null
        }
        Update: {
          analyst_comment?: string | null
          competency_id?: string | null
          confidence_level?: string | null
          created_at?: string
          data_collection_method?: string | null
          entity_id?: string
          entity_type?: string
          evidence_id?: string
          field_name?: string | null
          field_value?: string | null
          hypothesis_id?: string | null
          need_id?: string | null
          partner_id?: string | null
          requires_interview_validation?: boolean | null
          source_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["competency_id"]
          },
          {
            foreignKeyName: "evidence_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "collaboration_hypotheses"
            referencedColumns: ["hypothesis_id"]
          },
          {
            foreignKeyName: "evidence_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "partner_needs"
            referencedColumns: ["need_id"]
          },
          {
            foreignKeyName: "evidence_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_overview"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "evidence_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "evidence_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "evidence_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "miem_units"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "evidence_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_overview"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      miem_units: {
        Row: {
          application_domain: string | null
          business_problem_focus: string | null
          collaboration_formats: string[] | null
          created_at: string
          discussion_readiness: string | null
          end_customer_fit: string | null
          external_id: string | null
          external_source: string | null
          industry_fit: string | null
          last_synced_at: string | null
          lead_contact_id: string | null
          lead_name: string | null
          notes: string | null
          readiness_level: string | null
          research_area: string | null
          team_summary: string | null
          unit_id: string
          unit_name: string
          unit_type: string | null
          updated_at: string
          value_chain_role: string | null
        }
        Insert: {
          application_domain?: string | null
          business_problem_focus?: string | null
          collaboration_formats?: string[] | null
          created_at?: string
          discussion_readiness?: string | null
          end_customer_fit?: string | null
          external_id?: string | null
          external_source?: string | null
          industry_fit?: string | null
          last_synced_at?: string | null
          lead_contact_id?: string | null
          lead_name?: string | null
          notes?: string | null
          readiness_level?: string | null
          research_area?: string | null
          team_summary?: string | null
          unit_id?: string
          unit_name: string
          unit_type?: string | null
          updated_at?: string
          value_chain_role?: string | null
        }
        Update: {
          application_domain?: string | null
          business_problem_focus?: string | null
          collaboration_formats?: string[] | null
          created_at?: string
          discussion_readiness?: string | null
          end_customer_fit?: string | null
          external_id?: string | null
          external_source?: string | null
          industry_fit?: string | null
          last_synced_at?: string | null
          lead_contact_id?: string | null
          lead_name?: string | null
          notes?: string | null
          readiness_level?: string | null
          research_area?: string | null
          team_summary?: string | null
          unit_id?: string
          unit_name?: string
          unit_type?: string | null
          updated_at?: string
          value_chain_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "miem_units_lead_contact_id_fkey"
            columns: ["lead_contact_id"]
            isOneToOne: false
            referencedRelation: "unit_contacts"
            referencedColumns: ["unit_contact_id"]
          },
        ]
      }
      next_steps: {
        Row: {
          action_description: string | null
          action_title: string
          created_at: string
          due_date: string | null
          entity_id: string
          entity_type: string
          hypothesis_id: string | null
          need_id: string | null
          next_step_id: string
          next_step_status: string | null
          notes: string | null
          owner_user_id: string | null
          partner_id: string | null
          result: string | null
          updated_at: string
        }
        Insert: {
          action_description?: string | null
          action_title: string
          created_at?: string
          due_date?: string | null
          entity_id: string
          entity_type: string
          hypothesis_id?: string | null
          need_id?: string | null
          next_step_id?: string
          next_step_status?: string | null
          notes?: string | null
          owner_user_id?: string | null
          partner_id?: string | null
          result?: string | null
          updated_at?: string
        }
        Update: {
          action_description?: string | null
          action_title?: string
          created_at?: string
          due_date?: string | null
          entity_id?: string
          entity_type?: string
          hypothesis_id?: string | null
          need_id?: string | null
          next_step_id?: string
          next_step_status?: string | null
          notes?: string | null
          owner_user_id?: string | null
          partner_id?: string | null
          result?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "next_steps_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "collaboration_hypotheses"
            referencedColumns: ["hypothesis_id"]
          },
          {
            foreignKeyName: "next_steps_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "partner_needs"
            referencedColumns: ["need_id"]
          },
          {
            foreignKeyName: "next_steps_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_overview"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "next_steps_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_needs: {
        Row: {
          budget_signal: string | null
          business_context: string | null
          created_at: string
          data_access_signal: string | null
          description: string | null
          expected_result: string | null
          maturity_level: string | null
          need_id: string
          need_status: string | null
          need_type: string | null
          notes: string | null
          owner_contact_id: string | null
          partner_id: string
          priority_level: string | null
          recommended_collaboration_format: string | null
          time_horizon: string | null
          title: string
          updated_at: string
        }
        Insert: {
          budget_signal?: string | null
          business_context?: string | null
          created_at?: string
          data_access_signal?: string | null
          description?: string | null
          expected_result?: string | null
          maturity_level?: string | null
          need_id?: string
          need_status?: string | null
          need_type?: string | null
          notes?: string | null
          owner_contact_id?: string | null
          partner_id: string
          priority_level?: string | null
          recommended_collaboration_format?: string | null
          time_horizon?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          budget_signal?: string | null
          business_context?: string | null
          created_at?: string
          data_access_signal?: string | null
          description?: string | null
          expected_result?: string | null
          maturity_level?: string | null
          need_id?: string
          need_status?: string | null
          need_type?: string | null
          notes?: string | null
          owner_contact_id?: string | null
          partner_id?: string
          priority_level?: string | null
          recommended_collaboration_format?: string | null
          time_horizon?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_needs_owner_contact_id_fkey"
            columns: ["owner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "partner_needs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_overview"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_needs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_profile_files: {
        Row: {
          created_at: string
          file_id: string
          file_size: number | null
          is_source_document: boolean
          mime_type: string | null
          notes: string | null
          original_filename: string
          partner_id: string
          profile_id: string
          storage_bucket: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_id?: string
          file_size?: number | null
          is_source_document?: boolean
          mime_type?: string | null
          notes?: string | null
          original_filename: string
          partner_id: string
          profile_id: string
          storage_bucket?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_id?: string
          file_size?: number | null
          is_source_document?: boolean
          mime_type?: string | null
          notes?: string | null
          original_filename?: string
          partner_id?: string
          profile_id?: string
          storage_bucket?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_profile_files_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_overview"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_profile_files_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_profile_files_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      partner_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          based_on_profile_id: string | null
          business_scale: string | null
          change_summary: string | null
          collaboration_opportunities: string | null
          company_overview: string | null
          created_at: string
          created_by: string | null
          current_relationship_with_miem: string | null
          generated_from_prompt: string | null
          generated_from_sources_json: Json | null
          generation_status: string | null
          is_current: boolean
          key_events_and_touchpoints: string | null
          last_generated_at: string | null
          needs_human_review: boolean | null
          partner_id: string
          profile_date: string | null
          profile_id: string
          profile_type: string
          recent_news_and_plans: string | null
          recommended_next_steps: string | null
          references_json: Json
          relationship_with_other_universities: string | null
          risks_and_constraints: string | null
          source_type: string
          status: string
          strategic_priorities: string | null
          summary_short: string | null
          talent_needs: string | null
          technology_focus: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          based_on_profile_id?: string | null
          business_scale?: string | null
          change_summary?: string | null
          collaboration_opportunities?: string | null
          company_overview?: string | null
          created_at?: string
          created_by?: string | null
          current_relationship_with_miem?: string | null
          generated_from_prompt?: string | null
          generated_from_sources_json?: Json | null
          generation_status?: string | null
          is_current?: boolean
          key_events_and_touchpoints?: string | null
          last_generated_at?: string | null
          needs_human_review?: boolean | null
          partner_id: string
          profile_date?: string | null
          profile_id?: string
          profile_type?: string
          recent_news_and_plans?: string | null
          recommended_next_steps?: string | null
          references_json?: Json
          relationship_with_other_universities?: string | null
          risks_and_constraints?: string | null
          source_type?: string
          status?: string
          strategic_priorities?: string | null
          summary_short?: string | null
          talent_needs?: string | null
          technology_focus?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          based_on_profile_id?: string | null
          business_scale?: string | null
          change_summary?: string | null
          collaboration_opportunities?: string | null
          company_overview?: string | null
          created_at?: string
          created_by?: string | null
          current_relationship_with_miem?: string | null
          generated_from_prompt?: string | null
          generated_from_sources_json?: Json | null
          generation_status?: string | null
          is_current?: boolean
          key_events_and_touchpoints?: string | null
          last_generated_at?: string | null
          needs_human_review?: boolean | null
          partner_id?: string
          profile_date?: string | null
          profile_id?: string
          profile_type?: string
          recent_news_and_plans?: string | null
          recommended_next_steps?: string | null
          references_json?: Json
          relationship_with_other_universities?: string | null
          risks_and_constraints?: string | null
          source_type?: string
          status?: string
          strategic_priorities?: string | null
          summary_short?: string | null
          talent_needs?: string | null
          technology_focus?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_profiles_based_on_profile_id_fkey"
            columns: ["based_on_profile_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "partner_profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_overview"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partners: {
        Row: {
          business_model: string | null
          city: string | null
          company_profile: string | null
          company_size: string | null
          created_at: string
          external_id: string | null
          external_source: string | null
          geography: string | null
          industry: string | null
          last_synced_at: string | null
          legal_name: string | null
          notes: string | null
          owner_user_id: string | null
          partner_id: string
          partner_name: string
          partner_status: string | null
          priority_level: string | null
          strategic_priorities: string | null
          subindustry: string | null
          technology_profile: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          business_model?: string | null
          city?: string | null
          company_profile?: string | null
          company_size?: string | null
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          geography?: string | null
          industry?: string | null
          last_synced_at?: string | null
          legal_name?: string | null
          notes?: string | null
          owner_user_id?: string | null
          partner_id?: string
          partner_name: string
          partner_status?: string | null
          priority_level?: string | null
          strategic_priorities?: string | null
          subindustry?: string | null
          technology_profile?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          business_model?: string | null
          city?: string | null
          company_profile?: string | null
          company_size?: string | null
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          geography?: string | null
          industry?: string | null
          last_synced_at?: string | null
          legal_name?: string | null
          notes?: string | null
          owner_user_id?: string | null
          partner_id?: string
          partner_name?: string
          partner_status?: string | null
          priority_level?: string | null
          strategic_priorities?: string | null
          subindustry?: string | null
          technology_profile?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          checked_at: string | null
          created_at: string
          notes: string | null
          partner_id: string | null
          publication_date: string | null
          publisher: string | null
          source_id: string
          source_reliability: string | null
          source_type: string | null
          source_url: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          checked_at?: string | null
          created_at?: string
          notes?: string | null
          partner_id?: string | null
          publication_date?: string | null
          publisher?: string | null
          source_id?: string
          source_reliability?: string | null
          source_type?: string | null
          source_url?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          checked_at?: string | null
          created_at?: string
          notes?: string | null
          partner_id?: string | null
          publication_date?: string | null
          publisher?: string | null
          source_id?: string
          source_reliability?: string | null
          source_type?: string | null
          source_url?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_overview"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "sources_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      sync_log: {
        Row: {
          action: string
          errors: Json | null
          finished_at: string | null
          id: string
          row_errors: Json | null
          spreadsheet_id: string | null
          started_at: string
          stats: Json | null
          tables: string[]
          trigger_user_id: string | null
          triggered_by: string
        }
        Insert: {
          action: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          row_errors?: Json | null
          spreadsheet_id?: string | null
          started_at?: string
          stats?: Json | null
          tables?: string[]
          trigger_user_id?: string | null
          triggered_by?: string
        }
        Update: {
          action?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          row_errors?: Json | null
          spreadsheet_id?: string | null
          started_at?: string
          stats?: Json | null
          tables?: string[]
          trigger_user_id?: string | null
          triggered_by?: string
        }
        Relationships: []
      }
      sync_settings: {
        Row: {
          auto_sync_enabled: boolean
          auto_sync_interval_minutes: number
          created_at: string
          default_tables: string[]
          enabled: boolean
          id: string
          spreadsheet_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_sync_enabled?: boolean
          auto_sync_interval_minutes?: number
          created_at?: string
          default_tables?: string[]
          enabled?: boolean
          id?: string
          spreadsheet_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_sync_enabled?: boolean
          auto_sync_interval_minutes?: number
          created_at?: string
          default_tables?: string[]
          enabled?: boolean
          id?: string
          spreadsheet_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      unit_contact_memberships: {
        Row: {
          created_at: string
          is_lead: boolean
          is_primary: boolean
          member_role: string
          membership_id: string
          notes: string | null
          sort_order: number
          unit_contact_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_lead?: boolean
          is_primary?: boolean
          member_role?: string
          membership_id?: string
          notes?: string | null
          sort_order?: number
          unit_contact_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_lead?: boolean
          is_primary?: boolean
          member_role?: string
          membership_id?: string
          notes?: string | null
          sort_order?: number
          unit_contact_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_contact_memberships_unit_contact_id_fkey"
            columns: ["unit_contact_id"]
            isOneToOne: false
            referencedRelation: "unit_contacts"
            referencedColumns: ["unit_contact_id"]
          },
          {
            foreignKeyName: "unit_contact_memberships_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "miem_units"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_contact_memberships_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_overview"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      unit_contacts: {
        Row: {
          availability_notes: string | null
          contact_role: string | null
          created_at: string
          email: string | null
          full_name: string
          is_primary: boolean
          job_title: string | null
          notes: string | null
          phone: string | null
          telegram: string | null
          unit_contact_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          availability_notes?: string | null
          contact_role?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          is_primary?: boolean
          job_title?: string | null
          notes?: string | null
          phone?: string | null
          telegram?: string | null
          unit_contact_id?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          availability_notes?: string | null
          contact_role?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          is_primary?: boolean
          job_title?: string | null
          notes?: string | null
          phone?: string | null
          telegram?: string | null
          unit_contact_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_contacts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "miem_units"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_contacts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_overview"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      unit_portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          item_type: string
          notes: string | null
          organization_name: string | null
          portfolio_item_id: string
          title: string
          unit_id: string
          updated_at: string
          url: string | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          item_type: string
          notes?: string | null
          organization_name?: string | null
          portfolio_item_id?: string
          title: string
          unit_id: string
          updated_at?: string
          url?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          item_type?: string
          notes?: string | null
          organization_name?: string | null
          portfolio_item_id?: string
          title?: string
          unit_id?: string
          updated_at?: string
          url?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_portfolio_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "miem_units"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_portfolio_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_overview"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      partner_overview: {
        Row: {
          city: string | null
          contacts_count: number | null
          created_at: string | null
          hypotheses_count: number | null
          industry: string | null
          needs_count: number | null
          next_steps_count: number | null
          owner_user_id: string | null
          partner_id: string | null
          partner_name: string | null
          partner_status: string | null
          priority_level: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      unit_overview: {
        Row: {
          competencies_count: number | null
          lead_name: string | null
          linked_hypotheses_count: number | null
          readiness_level: string | null
          research_area: string | null
          unit_id: string | null
          unit_name: string | null
          unit_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer"
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
      app_role: ["admin", "analyst", "viewer"],
    },
  },
} as const
