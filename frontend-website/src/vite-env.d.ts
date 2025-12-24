/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_API_KEY_PUBLIC: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_TWITCH_EXTENSION_CLIENT_ID: string;
  readonly VITE_NODE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
