self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification && event.notification.data && event.notification.data.url
  if (!url) {
    return
  }

  event.waitUntil(
    (async () => {
      try {
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        })

        // Try to focus an existing window
        for (const client of clients) {
          if (
            client.url === url ||
            client.url.startsWith(new URL(url, self.location.origin).origin)
          ) {
            if ('focus' in client) {
              await client.focus()
            }
            if ('navigate' in client) {
              await client.navigate(url)
              return
            }
          }
        }

        // No matching window found, open a new one
        await self.clients.openWindow(url)
      } catch (error) {
        console.error('[sw] Error handling notification click:', error)
        // Fallback: try to open window anyway
        try {
          await self.clients.openWindow(url)
        } catch (fallbackError) {
          console.error('[sw] Fallback window open failed:', fallbackError)
        }
      }
    })()
  )
})

self.addEventListener('push', (event) => {
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch (error) {
      console.warn('[sw] Failed to parse push payload as JSON', error)
      payload = { title: event.data.text() || 'Notification' }
    }
  }

  const title = payload.title || 'Notification'
  const resolveAsset = (value, fallbackPath) => {
    if (value && typeof value === 'string') {
      // If it's already a full URL, return it
      if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
        return value
      }
    }
    try {
      return new URL(fallbackPath, self.location.origin).href
    } catch {
      return fallbackPath
    }
  }

  const options = {
    body: payload.body,
    tag: payload.tag,
    data: payload.data,
    icon: resolveAsset(payload.icon, '/icon-192.png'),
    badge: resolveAsset(payload.badge, '/icon-32.png'),
    actions: payload.actions,
    requireInteraction: payload.requireInteraction || false,
    silent: payload.silent || false,
  }

  event.waitUntil(
    self.registration.showNotification(title, options).catch((error) => {
      console.error('[sw] Error showing notification:', error)
    })
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[sw] Push subscription changed')

  event.waitUntil(
    (async () => {
      try {
        // Notify all clients about the subscription change
        const clients = await self.clients.matchAll({
          includeUncontrolled: true,
          type: 'window',
        })

        for (const client of clients) {
          client.postMessage({ type: 'pushsubscriptionchange' })
        }

        // Optionally, try to resubscribe automatically
        // This would require storing the VAPID public key
      } catch (error) {
        console.error('[sw] Error handling subscription change:', error)
      }
    })()
  )
})

// Handle notification close event (optional)
self.addEventListener('notificationclose', (event) => {
  console.log('[sw] Notification closed:', event.notification.tag)
  // Could track analytics here if needed
})
