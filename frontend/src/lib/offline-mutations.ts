import { onlineManager } from '@tanstack/react-query'
import axios from 'axios'

export function isOfflineWriteNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}

export function markOfflineForWriteReplay() {
  // A response-less Axios failure can also mean a timeout, server outage, CORS
  // rejection, or aborted request. Only publish global offline state when the
  // browser agrees; otherwise TanStack can become stuck offline because no
  // future `online` event is guaranteed to fire.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    onlineManager.setOnline(false)
  }
}
