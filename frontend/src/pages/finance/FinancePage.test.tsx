import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { HttpResponse, http } from 'msw'
import { useLocation } from 'react-router-dom'
import { renderWithRouter, screen, waitFor, within } from '@/testing'
import { server } from '@/testing/mocks/server'
import FinancePage from './FinancePage'
import {
  cashAccount,
  financeLedger as ledger,
  transactionPage,
  veterinaryCategory,
} from './finance-test-fixtures'

function LocationPath() {
  return <output data-testid="location-path">{useLocation().pathname}</output>
}

const financeRoute = (page: React.ReactElement) => [
  { path: '/finance/:ledgerId?/:area?', element: page },
]

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
    renderWithRouter(<FinancePage />, {
      route: '/finance',
      routes: financeRoute(<FinancePage />),
    })
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
                ...cashAccount,
                name: 'Cash',
              },
            ],
            recent_transactions: [],
            spending_by_category: [],
            spending_by_pet: [],
            income_by_category: [],
            monthly_trend: [],
          },
        })
      ),
      http.get('http://localhost:3000/api/ledgers/7/transactions', () =>
        HttpResponse.json({ data: transactionPage([]) })
      ),
      http.get('http://localhost:3000/api/ledgers/7/accounts', () =>
        HttpResponse.json({ data: [cashAccount] })
      ),
      http.get('http://localhost:3000/api/ledgers/7/categories', () =>
        HttpResponse.json({ data: [veterinaryCategory] })
      ),
      http.get('http://localhost:3000/api/ledgers/7/pets', () => HttpResponse.json({ data: [] })),
      http.get('http://localhost:3000/api/ledgers/7/members', () => HttpResponse.json({ data: [] }))
    )
    const { user } = renderWithRouter(<FinancePage />, {
      route: '/finance',
      routes: financeRoute(
        <>
          <FinancePage />
          <LocationPath />
        </>
      ),
    })
    await waitFor(() => expect(screen.getByText('Catarchy Rescue')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Catarchy Rescue' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Finances' })).not.toBeInTheDocument()
    expect(screen.queryByText('Create another')).not.toBeInTheDocument()
    expect(screen.getByTestId('location-path')).toHaveTextContent('/finance/7/overview')
    expect(screen.getByRole('tab', { name: 'Transactions' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pets' })).toBeInTheDocument()
    expect(await screen.findByText('Activity by account')).toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add income' }))
    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByRole('combobox')[0]).toHaveTextContent('Income')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByRole('combobox')[0]).toHaveTextContent('Expense')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('tab', { name: 'Transactions' }))
    expect(screen.getByTestId('location-path')).toHaveTextContent('/finance/7/transactions')
    expect(await screen.findByText('No transactions yet.')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Accounts' }))
    expect(screen.getByTestId('location-path')).toHaveTextContent('/finance/7/accounts')
    expect(await screen.findByPlaceholderText('Account name')).toBeInTheDocument()
    expect(await screen.findByText('Cash box')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Categories' }))
    expect(screen.getByTestId('location-path')).toHaveTextContent('/finance/7/categories')
    expect(await screen.findByPlaceholderText('Category name')).toBeInTheDocument()
    expect(await screen.findByText('Veterinary care')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    expect(screen.getByTestId('location-path')).toHaveTextContent('/finance/7/settings')
    expect(await screen.findByText('Global settings')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Create a new (ledger|finance space)/ })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Permanently delete unused finances' })
    ).not.toBeInTheDocument()
  })

  it('only shows permanent deletion for an unused Ledger', async () => {
    const unusedLedger = { ...ledger, pet_count: 0, can_delete: true }
    let deleted = false
    server.use(
      http.get('http://localhost:3000/api/ledgers', ({ request }) => {
        const archived = new URL(request.url).searchParams.has('archived')
        return HttpResponse.json({ data: archived || deleted ? [] : [unusedLedger] })
      }),
      http.delete('http://localhost:3000/api/ledgers/7', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    const { user } = renderWithRouter(<FinancePage />, {
      route: '/finance/7/settings',
      routes: financeRoute(<FinancePage />),
    })

    await user.click(
      await screen.findByRole('button', { name: 'Permanently delete unused finances' })
    )
    const dialog = await screen.findByRole('alertdialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Permanently delete unused finances' })
    )

    expect((await screen.findAllByText('Start using finances')).length).toBeGreaterThan(0)
  })

  it('switches ledgers from the title chevron menu', async () => {
    const secondLedger = { ...ledger, id: 8, title: 'Foster Home' }
    server.use(
      http.get('http://localhost:3000/api/ledgers', ({ request }) => {
        const archived = new URL(request.url).searchParams.has('archived')
        return HttpResponse.json({ data: archived ? [] : [ledger, secondLedger] })
      })
    )
    const { user } = renderWithRouter(<FinancePage />, {
      route: '/finance/7/overview',
      routes: financeRoute(
        <>
          <FinancePage />
          <LocationPath />
        </>
      ),
    })

    await user.click(
      await screen.findByRole('button', {
        name: /(Choose|Select) (finances|finance space)/,
      })
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Foster Home' }))
    expect(screen.getByTestId('location-path')).toHaveTextContent('/finance/8/overview')
  })
})
