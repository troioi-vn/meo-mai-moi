/**
 * Captures Chrome's `beforeinstallprompt` so the app can offer install at a moment that makes
 * sense, instead of whenever the browser decides.
 *
 * The event fires once, early, and only if the browser considers the app installable — often
 * before React has mounted. So the listener is registered at module scope and this module is
 * imported from the entry point; a hook that only started listening on mount would miss it.
 *
 * Calling `preventDefault()` suppresses Chrome's own install affordance, which is the trade:
 * we get a button we can place deliberately, Chrome loses its automatic prompt. Its menu item
 * stays either way.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPromptOutcome = 'accepted' | 'dismissed' | 'unavailable'

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => {
    listener()
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })

  window.addEventListener('appinstalled', () => {
    // A used or stale prompt cannot be shown again; drop it so no button offers a dead action.
    deferredPrompt = null
    notify()
  })
}

export function subscribeToInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function canShowInstallPrompt(): boolean {
  return deferredPrompt !== null
}

export async function showInstallPrompt(): Promise<InstallPromptOutcome> {
  const prompt = deferredPrompt
  if (!prompt) return 'unavailable'

  // Spent on use whatever the answer, so clear it before awaiting the choice.
  deferredPrompt = null
  notify()

  await prompt.prompt()
  const { outcome } = await prompt.userChoice

  return outcome
}

/** Test seam: lets a spec drive the module without dispatching real browser events. */
export function __setDeferredPromptForTests(prompt: BeforeInstallPromptEvent | null): void {
  deferredPrompt = prompt
  notify()
}
