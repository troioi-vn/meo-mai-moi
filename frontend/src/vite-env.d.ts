/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_REVERB_APP_KEY: string
  readonly VITE_REVERB_HOST: string
  readonly VITE_REVERB_PORT: string
  readonly VITE_REVERB_SCHEME: string
  readonly VITE_UMAMI_URL?: string
  readonly VITE_UMAMI_WEBSITE_ID?: string
  readonly VITE_UMAMI_DOMAINS?: string
  readonly VITE_UMAMI_DEBUG?: string
  readonly VITE_UMAMI_LAZY_LOAD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  Pusher: typeof import('pusher-js')
  Echo: typeof import('laravel-echo').default
  Telegram?: {
    WebApp?: {
      initData: string
      ready: () => void
      expand: () => void
    }
  }
}
