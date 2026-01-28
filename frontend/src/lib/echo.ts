import Echo from 'laravel-echo'

let echoInstance: Echo | null = null
let pusherInitialized = false

/**
 * Get or create the Echo instance.
 * Lazy-loads to avoid WebSocket connection errors when:
 * - The Reverb server is not running
 * - Environment variables are not configured
 * - The user is not authenticated
 */
export async function getEcho(): Promise<Echo | null> {
  // Check if Reverb is configured
  const appKey = import.meta.env.VITE_REVERB_APP_KEY
  if (!appKey) {
    // Reverb not configured - skip WebSocket connection
    return null
  }

  if (!echoInstance) {
    if (!pusherInitialized) {
      const { default: Pusher } = await import('pusher-js')
      window.Pusher = Pusher
      pusherInitialized = true
    }

    const { default: EchoModule } = await import('laravel-echo')

    echoInstance = new EchoModule({
      broadcaster: 'reverb',
      key: appKey,
      wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
      wsPort: import.meta.env.VITE_REVERB_PORT ? parseInt(import.meta.env.VITE_REVERB_PORT) : 80,
      wssPort: import.meta.env.VITE_REVERB_PORT ? parseInt(import.meta.env.VITE_REVERB_PORT) : 443,
      forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
    })

    window.Echo = echoInstance
  }

  return echoInstance
}

/**
 * Disconnect and cleanup the Echo instance.
 * Call this when user logs out or when cleaning up.
 */
export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
    window.Echo = undefined
  }
}

// For backwards compatibility, but prefer getEcho()
export default {
  get instance() {
    return getEcho()
  },
}
