import ReactUmamiAnalytics from '@danielgtmn/umami-react'

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined
  }

  return value === 'true'
}

function parseDomains(value: string | undefined): string[] | undefined {
  const domains = value
    ?.split(',')
    .map((domain) => domain.trim())
    .filter(Boolean)

  return domains && domains.length > 0 ? domains : undefined
}

export function UmamiAnalytics() {
  const url = import.meta.env.VITE_UMAMI_URL?.trim()
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim()

  if (!url || !websiteId) {
    return null
  }

  return (
    <ReactUmamiAnalytics
      url={url}
      websiteId={websiteId}
      debug={parseBoolean(import.meta.env.VITE_UMAMI_DEBUG)}
      lazyLoad={parseBoolean(import.meta.env.VITE_UMAMI_LAZY_LOAD)}
      domains={parseDomains(import.meta.env.VITE_UMAMI_DOMAINS)}
    />
  )
}
