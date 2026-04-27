import { render, screen, waitFor } from '@/testing'
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
      expect(document.querySelector('.divide-y button')).toBeInTheDocument()
    })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('renders chat window when a chat is selected', async () => {
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

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    expect(document.querySelector('a[href="/requests/10"]')).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })
})
