/**
 * Typen für das Supabase-Schema.
 *
 * Handgeschrieben in Phase 0 (spiegelt die Migrationen exakt).
 * Sobald eine lokale Supabase läuft, per `pnpm db:types` regenerierbar –
 * das Format entspricht dem Output von `supabase gen types typescript`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MemberRole = "owner" | "admin" | "member";
export type RunStatus =
  | "draft"
  | "queued"
  | "collecting"
  | "filtering"
  | "scoring"
  | "analyzing"
  | "synthesizing"
  | "completed"
  | "failed"
  | "cancelled";
export type CreativeSource = "meta_ad" | "tiktok" | "instagram";
export type CreativeCategory = "core" | "adjacent" | "foreign";
export type PatternType = "hook" | "structure" | "offer_framing" | "cta" | "visual";
export type FeedbackVerdict = "fits" | "does_not_fit";
export type JobStatus = "pending" | "running" | "succeeded" | "failed";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
        };
        Relationships: [];
      };
      organization_invites: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: MemberRole;
          token: string;
          invited_by: string | null;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: MemberRole;
          token?: string;
          invited_by?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: MemberRole;
          token?: string;
          invited_by?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      industry_profiles: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          version: number;
          status: string;
          source_description: string;
          profile: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          version?: number;
          status?: string;
          source_description: string;
          profile?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          client_id?: string;
          version?: number;
          status?: string;
          source_description?: string;
          profile?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      analysis_runs: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          profile_id: string;
          status: RunStatus;
          config: Json;
          phase_counts: Json;
          cost_breakdown: Json;
          error_log: Json;
          started_at: string | null;
          finished_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          profile_id: string;
          status?: RunStatus;
          config?: Json;
          phase_counts?: Json;
          cost_breakdown?: Json;
          error_log?: Json;
          started_at?: string | null;
          finished_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          client_id?: string;
          profile_id?: string;
          status?: RunStatus;
          config?: Json;
          phase_counts?: Json;
          cost_breakdown?: Json;
          error_log?: Json;
          started_at?: string | null;
          finished_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          organization_id: string;
          platform: CreativeSource;
          external_id: string;
          handle: string | null;
          display_name: string | null;
          bio: string | null;
          follower_count: number | null;
          median_views: number | null;
          metrics: Json;
          last_refreshed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          platform: CreativeSource;
          external_id: string;
          handle?: string | null;
          display_name?: string | null;
          bio?: string | null;
          follower_count?: number | null;
          median_views?: number | null;
          metrics?: Json;
          last_refreshed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          platform?: CreativeSource;
          external_id?: string;
          handle?: string | null;
          display_name?: string | null;
          bio?: string | null;
          follower_count?: number | null;
          median_views?: number | null;
          metrics?: Json;
          last_refreshed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      creatives: {
        Row: {
          id: string;
          organization_id: string;
          run_id: string;
          source: CreativeSource;
          external_id: string;
          url: string;
          platforms: string[];
          account_id: string | null;
          caption: string | null;
          thumbnail_path: string | null;
          published_at: string | null;
          raw_metrics: Json;
          relevance_score: number | null;
          category: CreativeCategory | null;
          performance_score: number | null;
          score_breakdown: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          run_id: string;
          source: CreativeSource;
          external_id: string;
          url: string;
          platforms?: string[];
          account_id?: string | null;
          caption?: string | null;
          thumbnail_path?: string | null;
          published_at?: string | null;
          raw_metrics?: Json;
          relevance_score?: number | null;
          category?: CreativeCategory | null;
          performance_score?: number | null;
          score_breakdown?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          run_id?: string;
          source?: CreativeSource;
          external_id?: string;
          url?: string;
          platforms?: string[];
          account_id?: string | null;
          caption?: string | null;
          thumbnail_path?: string | null;
          published_at?: string | null;
          raw_metrics?: Json;
          relevance_score?: number | null;
          category?: CreativeCategory | null;
          performance_score?: number | null;
          score_breakdown?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      creative_analyses: {
        Row: {
          id: string;
          organization_id: string;
          creative_id: string;
          transcript: string | null;
          frame_paths: string[];
          analysis: Json;
          model: string;
          input_tokens: number;
          output_tokens: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          creative_id: string;
          transcript?: string | null;
          frame_paths?: string[];
          analysis?: Json;
          model: string;
          input_tokens?: number;
          output_tokens?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          creative_id?: string;
          transcript?: string | null;
          frame_paths?: string[];
          analysis?: Json;
          model?: string;
          input_tokens?: number;
          output_tokens?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      patterns: {
        Row: {
          id: string;
          organization_id: string;
          run_id: string;
          type: PatternType;
          title: string;
          description: string;
          frequency: number;
          example_creative_ids: string[];
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          run_id: string;
          type: PatternType;
          title: string;
          description: string;
          frequency?: number;
          example_creative_ids?: string[];
          data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          run_id?: string;
          type?: PatternType;
          title?: string;
          description?: string;
          frequency?: number;
          example_creative_ids?: string[];
          data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      pattern_reports: {
        Row: {
          id: string;
          organization_id: string;
          run_id: string;
          report: Json;
          model: string;
          input_tokens: number;
          output_tokens: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          run_id: string;
          report?: Json;
          model: string;
          input_tokens?: number;
          output_tokens?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          run_id?: string;
          report?: Json;
          model?: string;
          input_tokens?: number;
          output_tokens?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          run_id: string | null;
          input: Json;
          model: string | null;
          input_tokens: number;
          output_tokens: number;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          run_id?: string | null;
          input?: Json;
          model?: string | null;
          input_tokens?: number;
          output_tokens?: number;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          client_id?: string;
          run_id?: string | null;
          input?: Json;
          model?: string | null;
          input_tokens?: number;
          output_tokens?: number;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      generation_items: {
        Row: {
          id: string;
          organization_id: string;
          generation_id: string;
          kind: string;
          content: Json;
          pattern_id: string | null;
          source_creative_ids: string[];
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          generation_id: string;
          kind: string;
          content?: Json;
          pattern_id?: string | null;
          source_creative_ids?: string[];
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          generation_id?: string;
          kind?: string;
          content?: Json;
          pattern_id?: string | null;
          source_creative_ids?: string[];
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          organization_id: string;
          creative_id: string;
          user_id: string;
          verdict: FeedbackVerdict;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          creative_id: string;
          user_id: string;
          verdict: FeedbackVerdict;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          creative_id?: string;
          user_id?: string;
          verdict?: FeedbackVerdict;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: string;
          status: string;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: string;
          status?: string;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: string;
          status?: string;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_queue: {
        Row: {
          id: string;
          organization_id: string | null;
          run_id: string | null;
          job_type: string;
          payload: Json;
          status: JobStatus;
          priority: number;
          attempts: number;
          max_attempts: number;
          run_after: string;
          locked_by: string | null;
          locked_at: string | null;
          last_error: string | null;
          result: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          run_id?: string | null;
          job_type: string;
          payload?: Json;
          status?: JobStatus;
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          run_after?: string;
          locked_by?: string | null;
          locked_at?: string | null;
          last_error?: string | null;
          result?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          run_id?: string | null;
          job_type?: string;
          payload?: Json;
          status?: JobStatus;
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          run_after?: string;
          locked_by?: string | null;
          locked_at?: string | null;
          last_error?: string | null;
          result?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_org_member: {
        Args: { p_org_id: string };
        Returns: boolean;
      };
      is_org_admin: {
        Args: { p_org_id: string };
        Returns: boolean;
      };
      is_org_owner: {
        Args: { p_org_id: string };
        Returns: boolean;
      };
      create_organization: {
        Args: { p_name: string; p_slug: string };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      accept_invite: {
        Args: { p_token: string };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      org_members_with_email: {
        Args: { p_org_id: string };
        Returns: {
          user_id: string;
          email: string;
          role: MemberRole;
          created_at: string;
        }[];
      };
      claim_next_job: {
        Args: { p_worker_id: string; p_job_types?: string[] | null };
        Returns: Database["public"]["Tables"]["job_queue"]["Row"][];
      };
      complete_job: {
        Args: { p_job_id: string; p_result?: Json | null };
        Returns: undefined;
      };
      fail_job: {
        Args: { p_job_id: string; p_error: string };
        Returns: undefined;
      };
    };
    Enums: {
      member_role: MemberRole;
      run_status: RunStatus;
      creative_source: CreativeSource;
      creative_category: CreativeCategory;
      pattern_type: PatternType;
      feedback_verdict: FeedbackVerdict;
      job_status: JobStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
