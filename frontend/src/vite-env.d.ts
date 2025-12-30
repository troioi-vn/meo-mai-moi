/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_REVERB_APP_KEY: string
  readonly VITE_REVERB_HOST: string
  readonly VITE_REVERB_PORT: string
  readonly VITE_REVERB_SCHEME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  Pusher: typeof import('pusher-js')
  Echo: typeof import('laravel-echo').default
}
