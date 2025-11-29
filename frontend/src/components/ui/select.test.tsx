import { screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithRouter } from '@/testing'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

describe('Select', () => {
  it('renders correctly with a placeholder', async () => {
    renderWithRouter(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    )

    await waitFor(() => {
      expect(screen.getByText('Select a fruit')).toBeInTheDocument()
    })
  })

  it('opens and closes the select content on trigger click', async () => {
    renderWithRouter(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole('combobox')

    // Content should not be visible initially (though it might be in the DOM, it should not be accessible)
    expect(screen.queryByText('Apple')).not.toBeInTheDocument()
    expect(screen.queryByText('Banana')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    // Open the select
    fireEvent.click(trigger)
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Close the select by pressing Escape key
    fireEvent.keyDown(document, { key: 'Escape' })

    // After closing, wait for the aria-expanded attribute to be false
    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })

  it('selects an item and updates the value', async () => {
    const onChange = vi.fn()

    renderWithRouter(
      <Select onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger) // Open the select

    const appleItem = screen.getByText('Apple')
    fireEvent.click(appleItem) // Click on an item

    // Expect the value to be updated and displayed
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith('apple')

    // Content should be closed after selection
    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
