import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { HttpResponse, http } from 'msw'
import { renderWithRouter, screen, waitFor } from '@/testing'
import { server } from '@/testing/mocks/server'
import FinancePage from './FinancePage'

const currency = { code: 'VND', name: 'Dong', symbol: '₫', minor_units: 0 }
const ledger = {
  id: 7,
  title: 'Catarchy Rescue',
  currency_code: 'VND',
  currency,
  group_id: null,
  sync_group_pets: false,
  archived_at: null,
  member_count: 1,
  pet_count: 2,
}

describe('FinancePage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows onboarding without creating a default Ledger', async () => {
    server.use(
      http.get('http://localhost:3000/api/ledgers', ({ request }) => {
        const archived = new URL(request.url).searchParams.has('archived')
        return HttpResponse.json({ data: archived ? [] : [] })
      })
    )
    renderWithRouter(<FinancePage />)
    expect((await screen.findAllByText('Start using finances')).length).toBeGreaterThan(0)
  })

  it('shows dashboard activity and the complete workspace navigation', async () => {
    server.use(
      http.get('http://localhost:3000/api/ledgers', ({ request }) => {
        const archived = new URL(request.url).searchParams.has('archived')
        return HttpResponse.json({ data: archived ? [] : [ledger] })
      }),
      http.get('http://localhost:3000/api/ledgers/7/dashboard', () =>
        HttpResponse.json({
          data: {
            current_month: { income: 2000000, expense: 500000, net_activity: 1500000 },
            previous_month: { income: 1000000, expense: 400000 },
            accounts: [
              {
                id: 1,
                name: 'Cash',
                archived_at: null,
                income_minor: 2000000,
                expense_minor: 500000,
                net_activity_minor: 1500000,
              },
            ],
            recent_transactions: [],
            spending_by_category: [],
            spending_by_pet: [],
            income_by_category: [],
            monthly_trend: [],
          },
        })
      )
    )
    renderWithRouter(<FinancePage />)
    await waitFor(() => expect(screen.getByText('Catarchy Rescue')).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Transactions' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pets' })).toBeInTheDocument()
    expect(await screen.findByText('Activity by account')).toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()
  })
})
