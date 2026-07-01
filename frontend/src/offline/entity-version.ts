export function entityVersionFromRecord(
  record: { updated_at?: string | null } | undefined
): string | undefined {
  const version = record?.updated_at
  return typeof version === 'string' && version.length > 0 ? version : undefined
}
