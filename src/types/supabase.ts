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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_analysis: {
        Row: {
          ai_model: string
          ai_provider: string
          analysis_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          document_id: string | null
          error_message: string | null
          id: string
          input_tokens: number | null
          mcp_calls: Json | null
          mcp_servers_used: string[] | null
          metadata: Json | null
          output_tokens: number | null
          processing_time: number | null
          project_id: string | null
          prompt: string | null
          response: string | null
          started_at: string | null
          status: string | null
          structured_data: Json | null
          total_cost: number | null
          workflow_step: string | null
          workflow_type: string | null
        }
        Insert: {
          ai_model: string
          ai_provider: string
          analysis_type: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          mcp_calls?: Json | null
          mcp_servers_used?: string[] | null
          metadata?: Json | null
          output_tokens?: number | null
          processing_time?: number | null
          project_id?: string | null
          prompt?: string | null
          response?: string | null
          started_at?: string | null
          status?: string | null
          structured_data?: Json | null
          total_cost?: number | null
          workflow_step?: string | null
          workflow_type?: string | null
        }
        Update: {
          ai_model?: string
          ai_provider?: string
          analysis_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          mcp_calls?: Json | null
          mcp_servers_used?: string[] | null
          metadata?: Json | null
          output_tokens?: number | null
          processing_time?: number | null
          project_id?: string | null
          prompt?: string | null
          response?: string | null
          started_at?: string | null
          status?: string | null
          structured_data?: Json | null
          total_cost?: number | null
          workflow_step?: string | null
          workflow_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_performance: {
        Row: {
          avg_queue_time: number | null
          avg_response_time: number | null
          created_at: string | null
          date: string
          error_rate: number | null
          failed_requests: number | null
          hour: number | null
          id: string
          model_id: string
          successful_requests: number | null
          total_cost: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_requests: number | null
        }
        Insert: {
          avg_queue_time?: number | null
          avg_response_time?: number | null
          created_at?: string | null
          date?: string
          error_rate?: number | null
          failed_requests?: number | null
          hour?: number | null
          id?: string
          model_id: string
          successful_requests?: number | null
          total_cost?: number | null
          total_input_tokens?: number | null
          total_output_tokens?: number | null
          total_requests?: number | null
        }
        Update: {
          avg_queue_time?: number | null
          avg_response_time?: number | null
          created_at?: string | null
          date?: string
          error_rate?: number | null
          failed_requests?: number | null
          hour?: number | null
          id?: string
          model_id?: string
          successful_requests?: number | null
          total_cost?: number | null
          total_input_tokens?: number | null
          total_output_tokens?: number | null
          total_requests?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_performance_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          api_endpoint: string | null
          capabilities: string[] | null
          characteristics: Json | null
          cost_per_input_token: number
          cost_per_output_token: number
          created_at: string | null
          created_by: string | null
          id: string
          max_tokens: number
          metadata: Json | null
          model_id: string
          name: string
          provider: string
          rate_limits: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          api_endpoint?: string | null
          capabilities?: string[] | null
          characteristics?: Json | null
          cost_per_input_token?: number
          cost_per_output_token?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          max_tokens?: number
          metadata?: Json | null
          model_id: string
          name: string
          provider: string
          rate_limits?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string | null
          capabilities?: string[] | null
          characteristics?: Json | null
          cost_per_input_token?: number
          cost_per_output_token?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          max_tokens?: number
          metadata?: Json | null
          model_id?: string
          name?: string
          provider?: string
          rate_limits?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_content: {
        Row: {
          confidence_score: number | null
          content_type: string | null
          document_id: string | null
          extracted_at: string | null
          extraction_status: string | null
          id: string
          language: string | null
          metadata: Json | null
          ocr_text: string | null
          processed_text: string | null
          raw_text: string | null
        }
        Insert: {
          confidence_score?: number | null
          content_type?: string | null
          document_id?: string | null
          extracted_at?: string | null
          extraction_status?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          ocr_text?: string | null
          processed_text?: string | null
          raw_text?: string | null
        }
        Update: {
          confidence_score?: number | null
          content_type?: string | null
          document_id?: string | null
          extracted_at?: string | null
          extraction_status?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          ocr_text?: string | null
          processed_text?: string | null
          raw_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_content_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_embeddings: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_embeddings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string | null
          id: string
          is_processed: boolean | null
          metadata: Json | null
          mime_type: string
          parent_id: string | null
          project_id: string
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          file_type?: string | null
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          mime_type: string
          parent_id?: string | null
          project_id: string
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string | null
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          mime_type?: string
          parent_id?: string | null
          project_id?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_servers: {
        Row: {
          auth_config: Json | null
          capabilities: string[] | null
          created_at: string | null
          created_by: string | null
          health_status: Json | null
          id: string
          last_health_check: string | null
          metadata: Json | null
          name: string
          permissions: Json | null
          status: string | null
          type: string
          updated_at: string | null
          url: string
        }
        Insert: {
          auth_config?: Json | null
          capabilities?: string[] | null
          created_at?: string | null
          created_by?: string | null
          health_status?: Json | null
          id?: string
          last_health_check?: string | null
          metadata?: Json | null
          name: string
          permissions?: Json | null
          status?: string | null
          type: string
          updated_at?: string | null
          url: string
        }
        Update: {
          auth_config?: Json | null
          capabilities?: string[] | null
          created_at?: string | null
          created_by?: string | null
          health_status?: Json | null
          id?: string
          last_health_check?: string | null
          metadata?: Json | null
          name?: string
          permissions?: Json | null
          status?: string | null
          type?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_servers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_usage_logs: {
        Row: {
          command: string
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          parameters: Json | null
          project_id: string | null
          response: Json | null
          response_time: number | null
          server_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          command: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          parameters?: Json | null
          project_id?: string | null
          response?: Json | null
          response_time?: number | null
          server_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          command?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          parameters?: Json | null
          project_id?: string | null
          response?: Json | null
          response_time?: number | null
          server_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_usage_logs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_tickets: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          category: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          metadata: Json | null
          priority: string | null
          project_id: string | null
          requested_by: string | null
          requested_date: string | null
          reviewed_by: string | null
          sla_breach_at: string | null
          sla_priority: string | null
          sla_resolution_time: number | null
          sla_response_time: number | null
          started_at: string | null
          status: string | null
          subcategory: string | null
          ticket_number: string
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          category: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          project_id?: string | null
          requested_by?: string | null
          requested_date?: string | null
          reviewed_by?: string | null
          sla_breach_at?: string | null
          sla_priority?: string | null
          sla_resolution_time?: number | null
          sla_response_time?: number | null
          started_at?: string | null
          status?: string | null
          subcategory?: string | null
          ticket_number: string
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          project_id?: string | null
          requested_by?: string | null
          requested_date?: string | null
          reviewed_by?: string | null
          sla_breach_at?: string | null
          sla_priority?: string | null
          sla_resolution_time?: number | null
          sla_response_time?: number | null
          started_at?: string | null
          status?: string | null
          subcategory?: string | null
          ticket_number?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_tickets_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_tickets_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          metadata: Json | null
          role: string
          updated_at: string | null
          user_level: number | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          metadata?: Json | null
          role?: string
          updated_at?: string | null
          user_level?: number | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          metadata?: Json | null
          role?: string
          updated_at?: string | null
          user_level?: number | null
          username?: string | null
        }
        Relationships: []
      }
      project_ai_settings: {
        Row: {
          analysis_model_mappings: Json | null
          created_at: string | null
          default_model_id: string | null
          fallback_models: string[] | null
          id: string
          project_id: string
          settings: Json | null
          updated_at: string | null
          workflow_model_mappings: Json | null
        }
        Insert: {
          analysis_model_mappings?: Json | null
          created_at?: string | null
          default_model_id?: string | null
          fallback_models?: string[] | null
          id?: string
          project_id: string
          settings?: Json | null
          updated_at?: string | null
          workflow_model_mappings?: Json | null
        }
        Update: {
          analysis_model_mappings?: Json | null
          created_at?: string | null
          default_model_id?: string | null
          fallback_models?: string[] | null
          id?: string
          project_id?: string
          settings?: Json | null
          updated_at?: string | null
          workflow_model_mappings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_ai_settings_default_model_id_fkey"
            columns: ["default_model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_ai_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          permissions: Json | null
          project_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          permissions?: Json | null
          project_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          permissions?: Json | null
          project_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_info: Json | null
          client_info: Json | null
          created_at: string | null
          current_workflow_step: string | null
          description: string | null
          end_date: string | null
          id: string
          metadata: Json | null
          name: string
          owner_id: string
          project_types: string[] | null
          settings: Json | null
          start_date: string | null
          status: string
          updated_at: string | null
          workflow_config: Json | null
          workflow_progress: number | null
        }
        Insert: {
          budget_info?: Json | null
          client_info?: Json | null
          created_at?: string | null
          current_workflow_step?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name: string
          owner_id: string
          project_types?: string[] | null
          settings?: Json | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          workflow_config?: Json | null
          workflow_progress?: number | null
        }
        Update: {
          budget_info?: Json | null
          client_info?: Json | null
          created_at?: string | null
          current_workflow_step?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          owner_id?: string
          project_types?: string[] | null
          settings?: Json | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          workflow_config?: Json | null
          workflow_progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          metadata: Json | null
          ticket_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          ticket_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          ticket_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "operation_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_settings: {
        Row: {
          created_at: string | null
          fallback_models: string[] | null
          id: string
          preferred_model_id: string | null
          project_model_mappings: Json | null
          settings: Json | null
          task_model_mappings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fallback_models?: string[] | null
          id?: string
          preferred_model_id?: string | null
          project_model_mappings?: Json | null
          settings?: Json | null
          task_model_mappings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fallback_models?: string[] | null
          id?: string
          preferred_model_id?: string | null
          project_model_mappings?: Json | null
          settings?: Json | null
          task_model_mappings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_settings_preferred_model_id_fkey"
            columns: ["preferred_model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ai_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_usage: {
        Row: {
          cost: number | null
          created_at: string | null
          date: string
          hour: number | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          request_count: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          date: string
          hour?: number | null
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          request_count?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          date?: string
          hour?: number | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          request_count?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_api_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_project_member: {
        Args: {
          project_id_param: string
          role_param?: string
          user_id_param: string
        }
        Returns: boolean
      }
      auth_user_exists: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_documents: {
        Args: {
          match_count: number
          match_threshold: number
          project_uuid?: string
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      remove_project_member: {
        Args: { project_id_param: string; user_id_param: string }
        Returns: boolean
      }
      search_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const