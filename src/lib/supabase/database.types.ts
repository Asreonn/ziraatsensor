export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      pools: {
        Row: {
          created_at: string;
          id: string;
          location: string;
          name: string;
          sensor_offsets: Json;
          sort_order: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          location?: string;
          name: string;
          sensor_offsets?: Json;
          sort_order?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          sensor_offsets?: Json;
          sort_order?: number;
          user_id?: string;
        };
      };
      pool_system_status: {
        Row: {
          created_at: string;
          last_sync: string;
          pool_id: string;
          rssi: number;
          sensor_connections: Json;
          updated_at: string;
          uptime_seconds: number;
          voltage: number;
        };
        Insert: {
          created_at?: string;
          last_sync?: string;
          pool_id: string;
          rssi?: number;
          sensor_connections?: Json;
          updated_at?: string;
          uptime_seconds?: number;
          voltage?: number;
        };
        Update: {
          created_at?: string;
          last_sync?: string;
          pool_id?: string;
          rssi?: number;
          sensor_connections?: Json;
          updated_at?: string;
          uptime_seconds?: number;
          voltage?: number;
        };
      };
      sensor_readings: {
        Row: {
          id: number;
          pool_id: string;
          recorded_at: string;
          sensor_id: string;
          value: number;
        };
        Insert: {
          id?: number;
          pool_id: string;
          recorded_at?: string;
          sensor_id: string;
          value: number;
        };
        Update: {
          id?: number;
          pool_id?: string;
          recorded_at?: string;
          sensor_id?: string;
          value?: number;
        };
      };
      user_preferences: {
        Row: {
          created_at: string;
          refresh_interval_ms: number;
          updated_at: string;
          use_mock_data: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          refresh_interval_ms?: number;
          updated_at?: string;
          use_mock_data?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          refresh_interval_ms?: number;
          updated_at?: string;
          use_mock_data?: boolean;
          user_id?: string;
        };
      };
    };
    Functions: {
      bootstrap_user_workspace: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      create_pool: {
        Args: {
          pool_location?: string;
          pool_name: string;
        };
        Returns: string;
      };
    };
  };
}

export type PoolRow = Database['public']['Tables']['pools']['Row'];
export type PoolSystemStatusRow = Database['public']['Tables']['pool_system_status']['Row'];
export type SensorReadingRow = Database['public']['Tables']['sensor_readings']['Row'];
export type UserPreferencesRow = Database['public']['Tables']['user_preferences']['Row'];
