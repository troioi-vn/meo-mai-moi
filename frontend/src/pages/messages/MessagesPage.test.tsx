import { render, screen, userEvent, waitFor } from '@/testing'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AllTheProviders } from '@/testing/providers'
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import MessagesPage from './MessagesPage'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import { mockChat, mockChatMessage } from '@/testing/mocks/data/messaging'

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 1, name: 'User One' },
  }),
}))

describe('MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders chat list and empty state when no chat is selected', async () => {
    server.use(
      http.get('http://localhost:3000/api/msg/chats', () => {
        return HttpResponse.json({ data: [mockChat] })
      }),
      http.get('http://localhost:3000/api/msg/unread-count', () => {
        return HttpResponse.json({ data: { unread_message_count: 1 } })
      })
    )

    render(
      <MemoryRouter initialEntries={['/messages']}>
        <AllTheProviders>
          <Routes>
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:chatId" element={<MessagesPage />} />
          </Routes>
        </AllTheProviders>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /User Two/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Select a conversation')).toBeInTheDocument()
  })

  it('renders chat window when a chat is selected', async () => {
    let sentContent: string | null = null
    const sentMessage = {
      ...mockChatMessage,
      id: 101,
      sender: { ...mockChatMessage.sender, id: 1, name: 'User One' },
      content: 'I can help with that.',
      is_mine: true,
    }

    server.use(
      http.get('http://localhost:3000/api/msg/chats', () => {
        return HttpResponse.json({ data: [mockChat] })
      }),
      http.get('http://localhost:3000/api/msg/chats/1', () => {
        return HttpResponse.json({ data: mockChat })
      }),
      http.get('http://localhost:3000/api/msg/chats/1/messages', () => {
        return HttpResponse.json({
          data: {
            data: [mockChatMessage],
            meta: { has_more: false, next_cursor: null },
          },
        })
      }),
      http.post('http://localhost:3000/api/msg/chats/1/read', () => {
        return HttpResponse.json({ success: true })
      }),
      http.post('http://localhost:3000/api/msg/chats/1/messages', async ({ request }) => {
        const body = (await request.json()) as { content?: string }
        sentContent = body.content ?? null
        return HttpResponse.json({ data: sentMessage }, { status: 201 })
      }),
      http.get('http://localhost:3000/api/msg/unread-count', () => {
        return HttpResponse.json({ data: { unread_message_count: 1 } })
      })
    )

    render(
      <MemoryRouter initialEntries={['/messages/1']}>
        <AllTheProviders>
          <Routes>
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:chatId" element={<MessagesPage />} />
          </Routes>
        </AllTheProviders>
      </MemoryRouter>
    )

    const composer = await screen.findByRole('textbox')

    expect(document.querySelector('a[href="/requests/10"]')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.type(composer, 'I can help with that.')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(sentContent).toBe('I can help with that.')
      expect(screen.getByText('I can help with that.')).toBeInTheDocument()
    })
  })
})
