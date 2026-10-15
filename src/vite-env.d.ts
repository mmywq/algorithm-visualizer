/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_AUTH_PROVIDERS?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_LEGAL_ENTITY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
