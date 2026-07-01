import { onlineManager } from '@tanstack/react-query'
import axios from 'axios'

export function isOfflineWriteNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}

export function markOfflineForWriteReplay() {
  onlineManager.setOnline(false)
}
