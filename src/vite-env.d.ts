/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YOUTUBE_API_KEY?: string;
  readonly VITE_YOUTUBE_CHANNEL_ID?: string;
  readonly VITE_FORM_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
