export const mcpScopeDescription = (scope: string) => {
  const descriptions: Record<string, string> = {
    'pets:read': 'View your pets, including their basic profiles and photos',
    'health:read': 'View weight, vaccination, and medical records for pets you can access',
    'pets:write': 'Create pet profiles and edit profiles you are allowed to manage',
    'health:write': 'Add and edit weight, vaccination, and medical records for pets you can manage',
    'habits:read': 'View pet habit trackers, daily entries, and progress summaries',
    'habits:write': 'Create and manage pet habit trackers and daily entries',
    'microchips:read': 'View microchip identity records for pets you can access',
    'microchips:write': 'Add, correct, and remove microchip records for pets you can manage',
    'sharing:read': 'View pet collaborators, roles, suggestions, and invitation links',
    'sharing:write': 'Grant, change, revoke, accept, decline, or leave pet access',
    'placement:read': 'View placement opportunities, responses, and handover status',
    'placement:write': 'Create and manage placement requests, responses, and handovers',
    'helpers:read': 'Browse public helpers and view helper profiles available to you',
    'helpers:write': 'Create and manage your helper profiles and profile photos',
    'messages:read': 'View your private chats, messages, and unread counts',
    'messages:write':
      'Open placement chats, send or remove messages, mark chats read, and leave chats',
  }

  return descriptions[scope] ?? scope
}
