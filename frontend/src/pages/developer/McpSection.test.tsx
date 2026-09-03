import { describe, it, expect } from 'vite-plus/test'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithRouter } from '@/testing'
import { server } from '@/testing/mocks/server'
import McpSection from './McpSection'

function servePublicSettings(mcpBaseUrl: string | null) {
  server.use(
    http.get('http://localhost:3000/api/settings/public', () => {
      return HttpResponse.json({
        data: {
          invite_only_enabled: false,
          email_verification_required: true,
          telegram_bot_username: null,
          litter_min_members: 2,
          litter_max_members: 12,
          mcp_base_url: mcpBaseUrl,
        },
      })
    })
  )
}

describe('McpSection', () => {
  it('builds the endpoint from the gateway the server reports', async () => {
    // A served host that is not production, so a hardcoded URL cannot pass.
    servePublicSettings('https://mcp-probe.example.test')

    renderWithRouter(<McpSection />)

    expect(await screen.findByText('https://mcp-probe.example.test/mcp')).toBeInTheDocument()
  })

  it('puts the same endpoint inside the agent instructions', async () => {
    servePublicSettings('https://mcp-probe.example.test')

    renderWithRouter(<McpSection />)

    const prompt = await screen.findByText(/Connect to the Meo Mai Moi MCP server at/)
    expect(prompt.textContent).toContain('https://mcp-probe.example.test/mcp')
    expect(prompt.textContent).toContain('list_pets')
  })

  it('renders nothing when no gateway is configured', async () => {
    servePublicSettings(null)

    renderWithRouter(<McpSection />)

    // The endpoint block is what a misconfigured environment must never show.
    await waitFor(() => {
      expect(screen.queryByText(/\/mcp$/)).not.toBeInTheDocument()
    })
    expect(screen.queryByText('MCP for AI agents')).not.toBeInTheDocument()
  })
})
