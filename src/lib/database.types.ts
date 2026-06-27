export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tms_orders: {
        Row: {
          id: string;
          code: string;
          client: string;
          client_id: string | null;
          status: string;
          fee: number;
          created_at: string | null;
          updated_at: string | null;
          data: Json;
          updated_at_ts: string;
        };
        Insert: {
          id: string;
          code: string;
          client: string;
          client_id?: string | null;
          status?: string;
          fee?: number;
          created_at?: string | null;
          updated_at?: string | null;
          data?: Json;
          updated_at_ts?: string;
        };
        Update: {
          id?: string;
          code?: string;
          client?: string;
          client_id?: string | null;
          status?: string;
          fee?: number;
          created_at?: string | null;
          updated_at?: string | null;
          data?: Json;
          updated_at_ts?: string;
        };
        Relationships: [];
      };
      tms_products: {
        Row: {
          id: string;
          name: string;
          category: string;
          unit: string;
          data: Json;
          updated_at_ts: string;
        };
        Insert: {
          id: string;
          name: string;
          category?: string;
          unit?: string;
          data?: Json;
          updated_at_ts?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          unit?: string;
          data?: Json;
          updated_at_ts?: string;
        };
        Relationships: [];
      };
      tms_customers: {
        Row: {
          id: string;
          name: string;
          data: Json;
          updated_at_ts: string;
        };
        Insert: {
          id: string;
          name: string;
          data?: Json;
          updated_at_ts?: string;
        };
        Update: {
          id?: string;
          name?: string;
          data?: Json;
          updated_at_ts?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
