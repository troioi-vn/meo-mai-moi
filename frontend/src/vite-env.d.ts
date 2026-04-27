/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_REVERB_APP_KEY: string
  readonly VITE_REVERB_HOST: string
  readonly VITE_REVERB_PORT: string
  readonly VITE_REVERB_SCHEME: string
  readonly VITE_TELEGRAM_BOT_USERNAME?: string
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
  Pusher?: unknown
  Echo?: import('laravel-echo').default
  Telegram?: {
    WebApp?: {
      initData: string
      ready: () => void
      expand: () => void
    }
  }
}
