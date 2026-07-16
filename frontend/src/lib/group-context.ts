const STORAGE_KEY = 'my-pets-group-context'

export type GroupContextSelection = 'all' | number

export function readGroupContextSelection(): GroupContextSelection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw || raw === 'all') return 'all'
    const id = Number(raw)
    return Number.isFinite(id) && id > 0 ? id : 'all'
  } catch {
    return 'all'
  }
}

export function writeGroupContextSelection(selection: GroupContextSelection): void {
  try {
    localStorage.setItem(STORAGE_KEY, selection === 'all' ? 'all' : String(selection))
  } catch {
    // ignore storage errors
  }
}

export function clearGroupContextSelection(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore storage errors
  }
}
