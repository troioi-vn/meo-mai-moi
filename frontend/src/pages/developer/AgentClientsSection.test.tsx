import { describe, it, expect } from 'vite-plus/test'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithRouter } from '@/testing'
import { server } from '@/testing/mocks/server'
import { EVERYDAY_CARE_SCOPES } from '@/api/mcp-agent-clients'
import AgentClientsSection from './AgentClientsSection'

const API = 'http://localhost:3000/api/user/mcp-agent-clients'
const ALL_SCOPES = [...EVERYDAY_CARE_SCOPES, 'messages:read', 'finance:read']

function serveList(enabled: boolean, clients: unknown[] = []) {
  server.use(
    http.get(API, () =>
      HttpResponse.json({ data: { enabled, clients, available_scopes: ALL_SCOPES } })
    )
  )
}

describe('AgentClientsSection', () => {
  it('renders nothing while the feature is disabled', async () => {
    serveList(false)

    renderWithRouter(<AgentClientsSection />)

    await waitFor(() => {
      expect(screen.queryByText('Agent clients')).not.toBeInTheDocument()
    })
  })

  it('creates a client with everyday scopes and no expiry, then shows the secret once', async () => {
    serveList(true)
    let body: Record<string, unknown> | null = null
    server.use(
      http.post(API, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            data: {
              client: {
                id: 1,
                name: 'Hub',
                client_id: 'meo_ac_probe',
                scopes: EVERYDAY_CARE_SCOPES,
                expires_at: null,
                last_used_at: null,
                created_at: null,
              },
              client_secret: 'meo_agent_probe_secret',
            },
          },
          { status: 201 }
        )
      })
    )
    const user = userEvent.setup()

    renderWithRouter(<AgentClientsSection />)

    await user.click(await screen.findByRole('button', { name: 'Create agent client' }))
    await user.type(screen.getByLabelText('Name'), 'Hub')
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Create agent client' }))

    expect(await screen.findByText('meo_agent_probe_secret')).toBeInTheDocument()
    expect(screen.getByText('meo_ac_probe')).toBeInTheDocument()
    expect(body).toEqual({ name: 'Hub', scopes: EVERYDAY_CARE_SCOPES, expires_in_days: null })
  })

  it('warns when scopes go beyond everyday care', async () => {
    serveList(true)
    const user = userEvent.setup()

    renderWithRouter(<AgentClientsSection />)

    await user.click(await screen.findByRole('button', { name: 'Create agent client' }))
    expect(screen.queryByText(/beyond everyday care/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Everything' }))
    expect(screen.getByText(/beyond everyday care/)).toBeInTheDocument()
  })
})
