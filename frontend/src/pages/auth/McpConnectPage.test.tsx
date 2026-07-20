import { describe, expect, it } from 'vitest'
import { mcpScopeDescription } from './mcpScopeDescription'

describe('MCP consent scope copy', () => {
  it('describes each pet-care read and write scope independently', () => {
    expect(mcpScopeDescription('pets:read')).toContain('basic profiles')
    expect(mcpScopeDescription('health:read')).toContain('vaccination')
    expect(mcpScopeDescription('pets:write')).toContain('Create pet profiles')
    expect(mcpScopeDescription('health:write')).toContain('Add and edit')
    expect(mcpScopeDescription('habits:read')).toContain('daily entries')
    expect(mcpScopeDescription('habits:write')).toContain('Create and manage')
    expect(mcpScopeDescription('microchips:read')).toContain('identity records')
    expect(mcpScopeDescription('microchips:write')).toContain('remove microchip')
    expect(mcpScopeDescription('sharing:read')).toContain('collaborators')
    expect(mcpScopeDescription('sharing:write')).toContain('revoke')
    expect(mcpScopeDescription('placement:read')).toContain('placement opportunities')
    expect(mcpScopeDescription('placement:write')).toContain('handovers')
    expect(mcpScopeDescription('helpers:read')).toContain('public helpers')
    expect(mcpScopeDescription('helpers:write')).toContain('profile photos')
    expect(mcpScopeDescription('messages:read')).toContain('private chats')
    expect(mcpScopeDescription('messages:write')).toContain('leave chats')
  })

  it('does not silently relabel an unknown scope', () => {
    expect(mcpScopeDescription('unknown:scope')).toBe('unknown:scope')
  })
})
