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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          id: string
          internship_id: string
          notes: string | null
          status: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          id?: string
          internship_id: string
          notes?: string | null
          status: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          internship_id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          entity: string
          entity_id: string | null
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          company_code: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          industry: string | null
          name: string
          province: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_code: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          province?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_code?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          province?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_quotas: {
        Row: {
          company_id: string
          competency: string
          created_at: string
          id: string
          period: string
          quota: number
          updated_at: string
          used_quota: number
        }
        Insert: {
          company_id: string
          competency: string
          created_at?: string
          id?: string
          period: string
          quota?: number
          updated_at?: string
          used_quota?: number
        }
        Update: {
          company_id?: string
          competency?: string
          created_at?: string
          id?: string
          period?: string
          quota?: number
          updated_at?: string
          used_quota?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_quotas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_demand: {
        Row: {
          company_id: string | null
          competency: string
          created_at: string
          id: string
          location: string
          period: string
          requested_quota: number
        }
        Insert: {
          company_id?: string | null
          competency: string
          created_at?: string
          id?: string
          location: string
          period: string
          requested_quota?: number
        }
        Update: {
          company_id?: string | null
          competency?: string
          created_at?: string
          id?: string
          location?: string
          period?: string
          requested_quota?: number
        }
        Relationships: [
          {
            foreignKeyName: "competency_demand_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          attendance_score: number
          created_at: string
          discipline_score: number
          evaluator_name: string | null
          final_score: number
          id: string
          internship_id: string
          non_technical_score: number
          notes: string | null
          technical_score: number
          updated_at: string
        }
        Insert: {
          attendance_score?: number
          created_at?: string
          discipline_score: number
          evaluator_name?: string | null
          final_score?: number
          id?: string
          internship_id: string
          non_technical_score: number
          notes?: string | null
          technical_score: number
          updated_at?: string
        }
        Update: {
          attendance_score?: number
          created_at?: string
          discipline_score?: number
          evaluator_name?: string | null
          final_score?: number
          id?: string
          internship_id?: string
          non_technical_score?: number
          notes?: string | null
          technical_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: true
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_reports: {
        Row: {
          achievement: string | null
          activity: string
          created_at: string
          created_by: string | null
          id: string
          internship_id: string
          notes: string | null
          obstacles: string | null
          report_date: string
          updated_at: string
        }
        Insert: {
          achievement?: string | null
          activity: string
          created_at?: string
          created_by?: string | null
          id?: string
          internship_id: string
          notes?: string | null
          obstacles?: string | null
          report_date: string
          updated_at?: string
        }
        Update: {
          achievement?: string | null
          activity?: string
          created_at?: string
          created_by?: string | null
          id?: string
          internship_id?: string
          notes?: string | null
          obstacles?: string | null
          report_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_reports_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      internships: {
        Row: {
          approval_note: string | null
          approved_by: string | null
          company_id: string
          competency: string
          created_at: string
          end_date: string
          id: string
          period: string
          rejection_note: string | null
          school_id: string
          start_date: string
          status: string
          student_id: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          approval_note?: string | null
          approved_by?: string | null
          company_id: string
          competency: string
          created_at?: string
          end_date: string
          id?: string
          period: string
          rejection_note?: string | null
          school_id: string
          start_date: string
          status?: string
          student_id: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          approval_note?: string | null
          approved_by?: string | null
          company_id?: string
          competency?: string
          created_at?: string
          end_date?: string
          id?: string
          period?: string
          rejection_note?: string | null
          school_id?: string
          start_date?: string
          status?: string
          student_id?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          school_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          name?: string
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          province: string | null
          school_code: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          province?: string | null
          school_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          province?: string | null
          school_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          birth_date: string | null
          competency: string
          created_at: string
          email: string | null
          gender: string | null
          id: string
          name: string
          phone: string | null
          school_id: string
          status: string
          student_number: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          competency: string
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          name: string
          phone?: string | null
          school_id: string
          status?: string
          student_number: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          competency?: string
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          name?: string
          phone?: string | null
          school_id?: string
          status?: string
          student_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
      approve_internship: {
        Args: { _internship_id: string; _note: string }
        Returns: undefined
      }
      attendance_rate: { Args: { _internship_id: string }; Returns: number }
      current_school_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      internship_in_scope: {
        Args: { _internship_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      reject_internship: {
        Args: { _internship_id: string; _note: string }
        Returns: undefined
      }
      school_performance: {
        Args: never
        Returns: {
          city: string
          completed_internships: number
          discipline_score: number
          industry_score: number
          school_id: string
          school_name: string
          score: number
          success_rate: number
          total_internships: number
          total_students: number
        }[]
      }
      submit_internship: {
        Args: {
          _company_id: string
          _competency: string
          _end_date: string
          _period: string
          _start_date: string
          _student_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "ADMIN" | "GURU"
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
      app_role: ["ADMIN", "GURU"],
    },
  },
} as const
