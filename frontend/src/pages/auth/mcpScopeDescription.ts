import i18n from '@/i18n'
import type { TFunction } from 'i18next'

export const mcpScopeDescription = (scope: string, t: TFunction = i18n.t) => {
  const descriptions: Record<string, string> = {
    'pets:read': t('auth:mcp.scopes.pets_read'),
    'health:read': t('auth:mcp.scopes.health_read'),
    'pets:write': t('auth:mcp.scopes.pets_write'),
    'health:write': t('auth:mcp.scopes.health_write'),
    'habits:read': t('auth:mcp.scopes.habits_read'),
    'habits:write': t('auth:mcp.scopes.habits_write'),
    'microchips:read': t('auth:mcp.scopes.microchips_read'),
    'microchips:write': t('auth:mcp.scopes.microchips_write'),
    'sharing:read': t('auth:mcp.scopes.sharing_read'),
    'sharing:write': t('auth:mcp.scopes.sharing_write'),
    'placement:read': t('auth:mcp.scopes.placement_read'),
    'placement:write': t('auth:mcp.scopes.placement_write'),
    'helpers:read': t('auth:mcp.scopes.helpers_read'),
    'helpers:write': t('auth:mcp.scopes.helpers_write'),
    'messages:read': t('auth:mcp.scopes.messages_read'),
    'messages:write': t('auth:mcp.scopes.messages_write'),
    'groups:read': t('auth:mcp.scopes.groups_read'),
    'groups:write': t('auth:mcp.scopes.groups_write'),
    'finance:read': t('auth:mcp.scopes.finance_read'),
    'finance:write': t('auth:mcp.scopes.finance_write'),
    'notifications:read': t('auth:mcp.scopes.notifications_read'),
    'notifications:write': t('auth:mcp.scopes.notifications_write'),
    'profile:read': t('auth:mcp.scopes.profile_read'),
    'profile:write': t('auth:mcp.scopes.profile_write'),
    'invitations:read': t('auth:mcp.scopes.invitations_read'),
    'invitations:write': t('auth:mcp.scopes.invitations_write'),
  }

  return descriptions[scope] ?? scope
}
