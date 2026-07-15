import { describe, expect, it, vi } from 'vite-plus/test'
import { HttpResponse, http } from 'msw'
import { renderWithRouter, screen, waitFor, within } from '@/testing'
import { server } from '@/testing/mocks/server'
import {
  cashAccount,
  financeLedger,
  transactionPage,
  veterinaryCategory,
  veterinaryTransaction,
} from '../finance-test-fixtures'
import { AccountsPanel } from './AccountsPanel'
import { CategoriesPanel } from './CategoriesPanel'
import { TransactionsPanel } from './TransactionsPanel'

const api = 'http://localhost:3000/api/ledgers/7'

function transactionDependencies() {
  return [
    http.get(`${api}/accounts`, () => HttpResponse.json({ data: [cashAccount] })),
    http.get(`${api}/categories`, () => HttpResponse.json({ data: [veterinaryCategory] })),
    http.get(`${api}/pets`, () =>
      HttpResponse.json({
        data: [{ id: 41, name: 'Miso', can_view_profile: true, sources: ['ledger'] }],
      })
    ),
    http.get(`${api}/members`, () =>
      HttpResponse.json({
        data: [{ user_id: 51, name: 'Athanasius', start_at: '2026-01-01' }],
      })
    ),
  ]
}

describe('TransactionsPanel', () => {
  it('lists transactions and creates an expense through MSW', async () => {
    let transactions = [veterinaryTransaction]
    let submitted: Record<string, unknown> | undefined
    server.use(
      ...transactionDependencies(),
      http.get(`${api}/transactions`, () =>
        HttpResponse.json({ data: transactionPage(transactions) })
      ),
      http.post(`${api}/transactions`, async ({ request }) => {
        submitted = (await request.json()) as Record<string, unknown>
        const created = {
          ...veterinaryTransaction,
          id: 32,
          amount_minor: 125_000,
          amount: '125000',
          description: String(submitted.description),
        }
        transactions = [created, ...transactions]
        return HttpResponse.json({ data: created }, { status: 201 })
      })
    )

    const { user } = renderWithRouter(<TransactionsPanel ledger={financeLedger} />)
    expect(await screen.findByText('Annual check-up')).toBeInTheDocument()
    expect(screen.getAllByText(/Miso/).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Add transaction' }))
    const dialog = await screen.findByRole('dialog')
    const textboxes = within(dialog).getAllByRole('textbox')
    await user.type(textboxes[0]!, '125000')
    await user.type(textboxes[1]!, 'Follow-up medicine')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Follow-up medicine')).toBeInTheDocument()
    expect(submitted).toMatchObject({
      type: 'expense',
      amount: '125000',
      account_id: cashAccount.id,
      description: 'Follow-up medicine',
    })
  })

  it('renders the empty transaction state', async () => {
    server.use(
      ...transactionDependencies(),
      http.get(`${api}/transactions`, () => HttpResponse.json({ data: transactionPage([]) }))
    )

    renderWithRouter(<TransactionsPanel ledger={financeLedger} />)
    expect(await screen.findByText('No transactions yet.')).toBeInTheDocument()
  })
})

describe('AccountsPanel', () => {
  it('lists, creates, and archives accounts', async () => {
    let accounts = [cashAccount]
    const archiveRequest = vi.fn()
    server.use(
      http.get(`${api}/accounts`, () => HttpResponse.json({ data: accounts })),
      http.post(`${api}/accounts`, async ({ request }) => {
        const body = (await request.json()) as { name: string }
        const created = { ...cashAccount, id: 12, name: body.name, income_minor: 0 }
        accounts = [...accounts, created]
        return HttpResponse.json({ data: created }, { status: 201 })
      }),
      http.post(`${api}/accounts/11/archive`, () => {
        archiveRequest()
        accounts = accounts.map((account) =>
          account.id === 11 ? { ...account, archived_at: '2026-07-16T00:00:00Z' } : account
        )
        return HttpResponse.json({ data: accounts[0] })
      })
    )

    const { user } = renderWithRouter(<AccountsPanel ledger={financeLedger} />)
    expect(await screen.findByText('Cash box')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Account name'), 'Bank account')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('Bank account')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Archive' })[0]!)
    await waitFor(() => {
      expect(archiveRequest).toHaveBeenCalledOnce()
    })
    expect(await screen.findByText('Cash box')).toHaveClass('line-through')
  })
})

describe('CategoriesPanel', () => {
  it('lists and creates a category', async () => {
    let categories = [veterinaryCategory]
    let submitted: Record<string, unknown> | undefined
    server.use(
      http.get(`${api}/categories`, () => HttpResponse.json({ data: categories })),
      http.post(`${api}/categories`, async ({ request }) => {
        submitted = (await request.json()) as Record<string, unknown>
        const created = {
          ...veterinaryCategory,
          id: 22,
          name: String(submitted.name),
          applies_to: submitted.applies_to as 'expense',
        }
        categories = [...categories, created]
        return HttpResponse.json({ data: created }, { status: 201 })
      })
    )

    const { user } = renderWithRouter(<CategoriesPanel ledger={financeLedger} />)
    expect(await screen.findByText('Veterinary care')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Category name'), 'Food')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('Food')).toBeInTheDocument()
    expect(submitted).toEqual({ name: 'Food', applies_to: 'expense' })
  })
})
