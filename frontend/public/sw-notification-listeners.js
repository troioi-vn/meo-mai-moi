self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification && event.notification.data && event.notification.data.url
  if (!url) {
    return
  }

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of clients) {
        if ('focus' in client) {
          await client.focus()
        }
        if ('navigate' in client) {
          await client.navigate(url)
          return
        }
      }

      await self.clients.openWindow(url)
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
      payload = { title: event.data.text() }
    }
  }

  const title = payload.title || 'Notification'
  const resolveAsset = (value, fallbackPath) => {
    if (value && typeof value === 'string') {
      return value
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
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      })

      for (const client of clients) {
        client.postMessage({ type: 'pushsubscriptionchange' })
      }
    })()
  )
})

