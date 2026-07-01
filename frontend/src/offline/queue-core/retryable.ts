export function extractHttpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } }).response?.status
}

export function isRetryableHttpError(error: unknown): boolean {
  const status = extractHttpStatus(error)
  if (status === undefined) return true

  return status === 408 || status === 429 || status >= 500
}
