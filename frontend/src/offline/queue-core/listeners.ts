export function createListenerHub() {
  const listeners = new Set<() => void>()

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    notify() {
      for (const listener of listeners) {
        listener()
      }
    },
    clear() {
      listeners.clear()
    },
  }
}
