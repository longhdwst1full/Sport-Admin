/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_AUTH_TOKEN_TRANSPORT?: 'BODY' | 'COOKIE';
  readonly VITE_DEV_BYPASS_PERMISSIONS?: 'true' | 'false';
  readonly VITE_DEV_PERMISSIONS?: string;
  /** Supabase Realtime (báo đơn mới tức thì); thiếu một trong hai thì Admin dùng polling. Cả hai là giá trị công khai. */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
