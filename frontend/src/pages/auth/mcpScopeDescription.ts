export const mcpScopeDescription = (scope: string) => {
  const descriptions: Record<string, string> = {
    'pets:read': 'View your pets, including their basic profiles and photos',
    'health:read': 'View weight, vaccination, and medical records for pets you can access',
    'pets:write': 'Create pet profiles and edit profiles you are allowed to manage',
    'health:write': 'Add and edit weight, vaccination, and medical records for pets you can manage',
  }

  return descriptions[scope] ?? scope
}
