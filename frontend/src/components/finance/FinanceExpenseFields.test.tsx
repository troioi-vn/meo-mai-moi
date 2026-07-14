import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { fireEvent, renderWithRouter, screen, waitFor } from '@/testing'
import { HttpResponse, http } from 'msw'
import { server } from '@/testing/mocks/server'
import { FinanceExpenseFields, type FinanceExpenseInput } from './FinanceExpenseFields'

function Harness() {
  const [value, setValue] = useState<FinanceExpenseInput | null>(null)
  return <FinanceExpenseFields value={value} onChange={setValue} />
}

describe('FinanceExpenseFields', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:3000/api/ledgers', () =>
        HttpResponse.json({
          data: [
            {
              id: 1,
              title: 'Care',
              currency_code: 'VND',
              currency: { code: 'VND', name: 'Dong', symbol: '₫', minor_units: 0 },
              group_id: null,
              sync_group_pets: false,
              archived_at: null,
              member_count: 1,
              pet_count: 0,
            },
          ],
        })
      ),
      http.get('http://localhost:3000/api/ledgers/1/accounts', () =>
        HttpResponse.json({
          data: [
            {
              id: 2,
              name: 'Cash',
              archived_at: null,
              income_minor: 0,
              expense_minor: 0,
              net_activity_minor: 0,
            },
          ],
        })
      ),
      http.get('http://localhost:3000/api/ledgers/1/categories', () =>
        HttpResponse.json({
          data: [{ id: 3, name: 'Medical', applies_to: 'expense', archived_at: null }],
        })
      )
    )
  })

  it('preselects the only Ledger and its starter account and category', async () => {
    renderWithRouter(<Harness />)
    fireEvent.click(await screen.findByRole('checkbox'))
    await waitFor(() => expect(screen.getByDisplayValue('Care')).toBeInTheDocument())
    expect(await screen.findByDisplayValue('Cash')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Medical')).toBeInTheDocument()
  })
})
