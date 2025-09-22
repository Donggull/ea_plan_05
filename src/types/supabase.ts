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
        Relationships: []
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
        Relationships: []
      }
      pre_analysis_sessions: {
        Row: {
          ai_model: string
          ai_provider: string
          analysis_depth: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          mcp_config: Json | null
          metadata: Json | null
          processing_time: number | null
          project_id: string | null
          started_at: string | null
          status: string | null
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          ai_model?: string
          ai_provider?: string
          analysis_depth?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          mcp_config?: Json | null
          metadata?: Json | null
          processing_time?: number | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_model?: string
          ai_provider?: string
          analysis_depth?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          mcp_config?: Json | null
          metadata?: Json | null
          processing_time?: number | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_analyses: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          analysis_result: Json | null
          category: string | null
          confidence_score: number | null
          cost: number | null
          created_at: string | null
          document_id: string | null
          error_message: string | null
          id: string
          input_tokens: number | null
          mcp_enrichment: Json | null
          metadata: Json | null
          output_tokens: number | null
          processing_time: number | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          analysis_result?: Json | null
          category?: string | null
          confidence_score?: number | null
          cost?: number | null
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          mcp_enrichment?: Json | null
          metadata?: Json | null
          output_tokens?: number | null
          processing_time?: number | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          analysis_result?: Json | null
          category?: string | null
          confidence_score?: number | null
          cost?: number | null
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          mcp_enrichment?: Json | null
          metadata?: Json | null
          output_tokens?: number | null
          processing_time?: number | null
          session_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      ai_questions: {
        Row: {
          ai_model: string | null
          category: string | null
          confidence_score: number | null
          context: string | null
          created_at: string | null
          expected_format: string | null
          generated_by_ai: boolean | null
          id: string
          metadata: Json | null
          order_index: number
          question: string
          related_documents: string[] | null
          required: boolean | null
          session_id: string | null
        }
        Insert: {
          ai_model?: string | null
          category?: string | null
          confidence_score?: number | null
          context?: string | null
          created_at?: string | null
          expected_format?: string | null
          generated_by_ai?: boolean | null
          id?: string
          metadata?: Json | null
          order_index: number
          question: string
          related_documents?: string[] | null
          required?: boolean | null
          session_id?: string | null
        }
        Update: {
          ai_model?: string | null
          category?: string | null
          confidence_score?: number | null
          context?: string | null
          created_at?: string | null
          expected_format?: string | null
          generated_by_ai?: boolean | null
          id?: string
          metadata?: Json | null
          order_index?: number
          question?: string
          related_documents?: string[] | null
          required?: boolean | null
          session_id?: string | null
        }
        Relationships: []
      }
      user_answers: {
        Row: {
          answer: string | null
          answer_data: Json | null
          answered_at: string | null
          answered_by: string | null
          attachments: Json | null
          confidence: number | null
          id: string
          is_draft: boolean | null
          metadata: Json | null
          notes: string | null
          question_id: string | null
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          answer_data?: Json | null
          answered_at?: string | null
          answered_by?: string | null
          attachments?: Json | null
          confidence?: number | null
          id?: string
          is_draft?: boolean | null
          metadata?: Json | null
          notes?: string | null
          question_id?: string | null
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          answer_data?: Json | null
          answered_at?: string | null
          answered_by?: string | null
          attachments?: Json | null
          confidence?: number | null
          id?: string
          is_draft?: boolean | null
          metadata?: Json | null
          notes?: string | null
          question_id?: string | null
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      proposal_workflow_questions: {
        Row: {
          category: string
          created_at: string | null
          display_order: number
          help_text: string | null
          id: string
          is_dynamic: boolean | null
          is_required: boolean | null
          metadata: Json | null
          options: Json | null
          project_id: string
          question_id: string
          question_text: string
          question_type: string
          validation_rules: Json | null
          workflow_step: string
        }
        Insert: {
          category: string
          created_at?: string | null
          display_order: number
          help_text?: string | null
          id?: string
          is_dynamic?: boolean | null
          is_required?: boolean | null
          metadata?: Json | null
          options?: Json | null
          project_id: string
          question_id: string
          question_text: string
          question_type: string
          validation_rules?: Json | null
          workflow_step: string
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number
          help_text?: string | null
          id?: string
          is_dynamic?: boolean | null
          is_required?: boolean | null
          metadata?: Json | null
          options?: Json | null
          project_id?: string
          question_id?: string
          question_text?: string
          question_type?: string
          validation_rules?: Json | null
          workflow_step?: string
        }
        Relationships: []
      }
      proposal_workflow_responses: {
        Row: {
          answer_data: Json | null
          answer_text: string | null
          confidence_score: number | null
          id: string
          is_temporary: boolean | null
          metadata: Json | null
          notes: string | null
          project_id: string
          question_id: string
          responded_at: string | null
          responded_by: string | null
          updated_at: string | null
          workflow_step: string
        }
        Insert: {
          answer_data?: Json | null
          answer_text?: string | null
          confidence_score?: number | null
          id?: string
          is_temporary?: boolean | null
          metadata?: Json | null
          notes?: string | null
          project_id: string
          question_id: string
          responded_at?: string | null
          responded_by?: string | null
          updated_at?: string | null
          workflow_step: string
        }
        Update: {
          answer_data?: Json | null
          answer_text?: string | null
          confidence_score?: number | null
          id?: string
          is_temporary?: boolean | null
          metadata?: Json | null
          notes?: string | null
          project_id?: string
          question_id?: string
          responded_at?: string | null
          responded_by?: string | null
          updated_at?: string | null
          workflow_step?: string
        }
        Relationships: []
      }
      proposal_workflow_analysis: {
        Row: {
          ai_model: string
          ai_provider: string
          analysis_prompt: string | null
          analysis_result: string | null
          analysis_type: string
          completed_at: string | null
          confidence_score: number | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          input_documents: string[] | null
          input_responses: string[] | null
          input_tokens: number | null
          metadata: Json | null
          next_questions: Json | null
          output_tokens: number | null
          processing_time: number | null
          project_id: string
          prompt_template: string | null
          recommendations: Json | null
          status: string | null
          structured_output: Json | null
          workflow_step: string
        }
        Insert: {
          ai_model: string
          ai_provider: string
          analysis_prompt?: string | null
          analysis_result?: string | null
          analysis_type: string
          completed_at?: string | null
          confidence_score?: number | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          input_documents?: string[] | null
          input_responses?: string[] | null
          input_tokens?: number | null
          metadata?: Json | null
          next_questions?: Json | null
          output_tokens?: number | null
          processing_time?: number | null
          project_id: string
          prompt_template?: string | null
          recommendations?: Json | null
          status?: string | null
          structured_output?: Json | null
          workflow_step: string
        }
        Update: {
          ai_model?: string
          ai_provider?: string
          analysis_prompt?: string | null
          analysis_result?: string | null
          analysis_type?: string
          completed_at?: string | null
          confidence_score?: number | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          input_documents?: string[] | null
          input_responses?: string[] | null
          input_tokens?: number | null
          metadata?: Json | null
          next_questions?: Json | null
          output_tokens?: number | null
          processing_time?: number | null
          project_id?: string
          prompt_template?: string | null
          recommendations?: Json | null
          status?: string | null
          structured_output?: Json | null
          workflow_step?: string
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
        Relationships: []
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
        Relationships: []
      }
      user_api_usage: {
        Row: {
          api_provider: string
          cost: number | null
          created_at: string | null
          date: string | null
          endpoint: string | null
          hour: number | null
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string
          output_tokens: number | null
          project_id: string | null
          request_count: number | null
          session_id: string | null
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          api_provider: string
          cost?: number | null
          created_at?: string | null
          date?: string | null
          endpoint?: string | null
          hour?: number | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model: string
          output_tokens?: number | null
          project_id?: string | null
          request_count?: number | null
          session_id?: string | null
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          api_provider?: string
          cost?: number | null
          created_at?: string | null
          date?: string | null
          endpoint?: string | null
          hour?: number | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string
          output_tokens?: number | null
          project_id?: string | null
          request_count?: number | null
          session_id?: string | null
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_model_performance: {
        Row: {
          id: string
          model_id: string
          date: string
          hour: number | null
          total_requests: number
          successful_requests: number
          failed_requests: number
          total_input_tokens: number
          total_output_tokens: number
          total_cost: number
          avg_response_time: number
          avg_queue_time: number
          error_rate: number
          average_tokens_per_second: number | null
          performance_metrics: Json | null
          total_calls: number | null
          total_errors: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          model_id: string
          date: string
          hour?: number | null
          total_requests?: number
          successful_requests?: number
          failed_requests?: number
          total_input_tokens?: number
          total_output_tokens?: number
          total_cost?: number
          avg_response_time?: number
          avg_queue_time?: number
          error_rate?: number
          average_tokens_per_second?: number | null
          performance_metrics?: Json | null
          total_calls?: number | null
          total_errors?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          model_id?: string
          date?: string
          hour?: number | null
          total_requests?: number
          successful_requests?: number
          failed_requests?: number
          total_input_tokens?: number
          total_output_tokens?: number
          total_cost?: number
          avg_response_time?: number
          avg_queue_time?: number
          error_rate?: number
          average_tokens_per_second?: number | null
          performance_metrics?: Json | null
          total_calls?: number | null
          total_errors?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          permissions: Json | null
          joined_at: string | null
          invited_by: string | null
          status: string | null
          is_active: boolean | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: string
          permissions?: Json | null
          joined_at?: string | null
          invited_by?: string | null
          status?: string | null
          is_active?: boolean | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          permissions?: Json | null
          joined_at?: string | null
          invited_by?: string | null
          status?: string | null
          is_active?: boolean | null
          metadata?: Json | null
        }
        Relationships: []
      }
      document_content: {
        Row: {
          id: string
          document_id: string
          processed_text: string | null
          raw_text: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          document_id: string
          processed_text?: string | null
          raw_text?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          document_id?: string
          processed_text?: string | null
          raw_text?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      analysis_reports: {
        Row: {
          id: string
          session_id: string
          report_type: string
          report_content: Json
          ai_model: string
          ai_provider: string
          total_processing_time: number | null
          total_cost: number | null
          input_tokens: number | null
          output_tokens: number | null
          generated_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          report_type: string
          report_content: Json
          ai_model: string
          ai_provider: string
          total_processing_time?: number | null
          total_cost?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          generated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          report_type?: string
          report_content?: Json
          ai_model?: string
          ai_provider?: string
          total_processing_time?: number | null
          total_cost?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          generated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      qa_conversations: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: string
          is_public: boolean
          tags: string[]
          message_count: number
          last_message_at: string | null
          created_by: string
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: string
          is_public?: boolean
          tags?: string[]
          message_count?: number
          last_message_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: string
          is_public?: boolean
          tags?: string[]
          message_count?: number
          last_message_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Relationships: []
      }
      qa_messages: {
        Row: {
          id: string
          conversation_id: string
          type: string
          content: string
          content_format: string
          is_ai_generated: boolean
          ai_model: string | null
          ai_provider: string | null
          ai_confidence: number | null
          processing_time: number | null
          input_tokens: number | null
          output_tokens: number | null
          ai_cost: number | null
          votes_up: number
          votes_down: number
          is_marked_as_answer: boolean
          is_helpful: boolean
          user_id: string
          user_name: string | null
          user_role: string | null
          created_at: string
          updated_at: string
          edited_at: string | null
          is_edited: boolean
        }
        Insert: {
          id?: string
          conversation_id: string
          type?: string
          content: string
          content_format?: string
          is_ai_generated?: boolean
          ai_model?: string | null
          ai_provider?: string | null
          ai_confidence?: number | null
          processing_time?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          ai_cost?: number | null
          votes_up?: number
          votes_down?: number
          is_marked_as_answer?: boolean
          is_helpful?: boolean
          user_id: string
          user_name?: string | null
          user_role?: string | null
          created_at?: string
          updated_at?: string
          edited_at?: string | null
          is_edited?: boolean
        }
        Update: {
          id?: string
          conversation_id?: string
          type?: string
          content?: string
          content_format?: string
          is_ai_generated?: boolean
          ai_model?: string | null
          ai_provider?: string | null
          ai_confidence?: number | null
          processing_time?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          ai_cost?: number | null
          votes_up?: number
          votes_down?: number
          is_marked_as_answer?: boolean
          is_helpful?: boolean
          user_id?: string
          user_name?: string | null
          user_role?: string | null
          created_at?: string
          updated_at?: string
          edited_at?: string | null
          is_edited?: boolean
        }
        Relationships: []
      }
      qa_attachments: {
        Row: {
          id: string
          message_id: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          thumbnail_url: string | null
          uploaded_by: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          message_id: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          thumbnail_url?: string | null
          uploaded_by: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          thumbnail_url?: string | null
          uploaded_by?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      qa_message_votes: {
        Row: {
          id: string
          message_id: string
          user_id: string
          vote_type: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          vote_type: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          vote_type?: string
          created_at?: string
        }
        Relationships: []
      }
      qa_notifications: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          message_id: string | null
          type: string
          title: string
          content: string
          is_read: boolean
          action_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          message_id?: string | null
          type: string
          title: string
          content: string
          is_read?: boolean
          action_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          message_id?: string | null
          type?: string
          title?: string
          content?: string
          is_read?: boolean
          action_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      qa_conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          role: string
          is_subscribed: boolean
          last_read_at: string
          joined_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          role?: string
          is_subscribed?: boolean
          last_read_at?: string
          joined_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          role?: string
          is_subscribed?: boolean
          last_read_at?: string
          joined_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']