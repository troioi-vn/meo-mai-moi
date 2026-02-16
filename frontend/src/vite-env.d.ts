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
  Telegram?: {
    WebApp?: {
      initData: string
      ready: () => void
      expand: () => void
    }
    Login?: {
      auth: (
        options: { bot_id: number; request_access?: boolean | string },
        callback: (data: TelegramLoginWidgetData | false) => void
      ) => void
    }
  }
}

interface TelegramLoginWidgetData {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}
