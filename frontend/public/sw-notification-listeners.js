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

