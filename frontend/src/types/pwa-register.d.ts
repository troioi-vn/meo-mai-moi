declare module 'virtual:pwa-register' {
  interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegisteredSW?: (
      swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined
    ) => void
    onRegisterError?: (error: unknown) => void
  }

  type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

  export function registerSW(options?: RegisterSWOptions): UpdateServiceWorker
}
