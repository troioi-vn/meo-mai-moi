import { describe, expect, it } from 'vitest'
import { mcpScopeDescription } from './mcpScopeDescription'

describe('MCP consent scope copy', () => {
  it('describes pet and health reads independently', () => {
    expect(mcpScopeDescription('pets:read')).toContain('basic profiles')
    expect(mcpScopeDescription('health:read')).toContain('vaccination')
  })

  it('does not silently relabel an unknown scope', () => {
    expect(mcpScopeDescription('unknown:scope')).toBe('unknown:scope')
  })
})
