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
      brands: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      phone_models: {
        Row: {
          color: string | null
          created_at: string
          id: string
          model: string
          storage_capacity: string | null
          updated_at: string
          brand_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          model: string
          storage_capacity?: string | null
          updated_at?: string
          brand_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          model?: string
          storage_capacity?: string | null
          updated_at?: string
          brand_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ]
      }
      deprecated_stock_entries: {
        Row: {
          add_stock: number
          adjustment: number
          created_at: string
          date: string
          id: string
          imei: string | null
          incoming: number
          location_id: string
          morning_stock: number
          night_stock: number
          notes: string | null
          phone_model_id: string
          returns: number
          sold: number
          updated_at: string
        }
        Insert: {
          add_stock?: number
          adjustment?: number
          created_at?: string
          date?: string
          id?: string
          imei?: string | null
          incoming?: number
          location_id: string
          morning_stock?: number
          night_stock?: number
          notes?: string | null
          phone_model_id: string
          returns?: number
          sold?: number
          updated_at?: string
        }
        Update: {
          add_stock?: number
          adjustment?: number
          created_at?: string
          date?: string
          id?: string
          imei?: string | null
          incoming?: number
          location_id?: string
          morning_stock?: number
          night_stock?: number
          notes?: string | null
          phone_model_id?: string
          returns?: number
          sold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_phone_model_id_fkey"
            columns: ["phone_model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_units: {
        Row: {
          id: string
          imei: string
          phone_model_id: string
          location_id: string
          status: Database["public"]["Enums"]["stock_status"]
          entry_date: string
          transaction_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          imei: string
          phone_model_id: string
          location_id: string
          status?: Database["public"]["Enums"]["stock_status"]
          entry_date?: string
          transaction_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          imei?: string
          phone_model_id?: string
          location_id?: string
          status?: Database["public"]["Enums"]["stock_status"]
          entry_date?: string
          transaction_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_units_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_units_phone_model_id_fkey"
            columns: ["phone_model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_transactions: {
        Row: {
          id: string
          stock_unit_id: string
          transaction_type: Database["public"]["Enums"]["stock_status"]
          transaction_date: string
          from_location_id: string | null
          to_location_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          stock_unit_id: string
          transaction_type: Database["public"]["Enums"]["stock_status"]
          transaction_date: string
          from_location_id?: string | null
          to_location_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          stock_unit_id?: string
          transaction_type?: Database["public"]["Enums"]["stock_status"]
          transaction_date?: string
          from_location_id?: string | null
          to_location_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_stock_unit_id_fkey"
            columns: ["stock_unit_id"]
            isOneToOne: false
            referencedRelation: "stock_units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_brand: {
        Args: { p_brand_name: string }
        Returns: string
      }
      get_brands: {
        Args: Record<PropertyKey, never>
        Returns: { id: string; name: string }[]
      }
      add_stock_unit: {
        Args: {
          p_imei: string
          p_phone_model_id: string
          p_location_id: string
          p_entry_date: string
          p_notes: string
        }
        Returns: string
      }
      sell_stock_unit: {
        Args: {
          p_imei: string
          p_sell_date: string
          p_notes: string
        }
        Returns: undefined
      }
      transfer_stock_unit: {
        Args: {
          p_imei: string
          p_new_location_id: string
          p_transfer_date: string
          p_notes: string
        }
        Returns: undefined
      }
      get_stock_by_date: {
        Args: {
          p_report_date: string
          p_location_id: string
        }
        Returns: {
          id: string
          imei: string
          phone_model_id: string
          location_id: string
          status: Database["public"]["Enums"]["stock_status"]
          entry_date: string
          transaction_date: string | null
          notes: string | null
        }[]
      }
      delete_stock_unit: {
        Args: {
          p_unit_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      stock_status: "available" | "sold" | "transferred" | "returned"
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
