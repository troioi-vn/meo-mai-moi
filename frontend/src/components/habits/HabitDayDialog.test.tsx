import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import { AllTheProviders } from '@/testing/providers'
import { HabitDayDialog } from './HabitDayDialog'
import { onlineManager } from '@tanstack/react-query'
import { resetOperationsStoreForTests } from '@/offline/operations'
import type { Habit } from '@/api/generated/model'

const habitsDayApi = vi.hoisted(() => ({
  getHabitDayEntries: vi.fn(),
  putHabitDayEntries: vi.fn(),
}))

vi.mock('@/api/habits-day', () => ({
  getHabitDayEntries: habitsDayApi.getHabitDayEntries,
  putHabitDayEntries: habitsDayApi.putHabitDayEntries,
}))

const baseHabit = {
  id: 1,
  name: 'Test Habit',
  value_type: 'yes_no',
  scale_min: 1,
  scale_max: 10,
  pets: [
    { id: 101, name: 'Milo', photo_url: 'https://example.com/milo.jpg' },
    { id: 102, name: 'Luna', photo_url: null },
  ],
} as unknown as Habit

function renderDialog(habit: Habit = baseHabit, date = '2026-04-08') {
  return render(
    <HabitDayDialog
      habit={habit}
      date={date}
      open={true}
      onOpenChange={() => {}}
      onSaved={() => {}}
    />,
    { wrapper: AllTheProviders }
  )
}

describe('HabitDayDialog', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
  })

  it('renders an avatar for each pet row with photo and fallback initials', async () => {
    habitsDayApi.getHabitDayEntries.mockResolvedValue({
      habit: baseHabit,
      date: '2026-04-08',
      entries: [
        {
          pet_id: 101,
          pet_name: 'Milo',
          pet_photo_url: 'https://example.com/milo.jpg',
          value_int: 1,
          is_current_pet: true,
          has_entry: true,
        },
        {
          pet_id: 102,
          pet_name: 'Luna',
          pet_photo_url: null,
          value_int: null,
          is_current_pet: true,
          has_entry: false,
        },
        {
          pet_id: 103,
          pet_name: 'Oldie',
          pet_photo_url: 'https://example.com/old.jpg',
          value_int: null,
          is_current_pet: false,
          has_entry: false,
        },
      ],
    })

    renderDialog()

    await waitFor(() => {
      expect(habitsDayApi.getHabitDayEntries).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText('Milo')).toBeInTheDocument()
      expect(screen.getByText('Luna')).toBeInTheDocument()
      expect(screen.getByText('Oldie')).toBeInTheDocument()
    })

    // Avatars are rendered for every row, including historical pets.
    // Radix Avatar shows fallback initials in jsdom (image load is not simulated),
    // so we assert on the initials which are always in the DOM.
    expect(screen.getByText('MI')).toBeInTheDocument()
    expect(screen.getByText('LU')).toBeInTheDocument()
    expect(screen.getByText('OL')).toBeInTheDocument()

    // One avatar per entry (dialog renders in a portal, so query document.body)
    const avatars = document.body.querySelectorAll('[data-slot="avatar"]')
    expect(avatars).toHaveLength(3)

    // Not covered here: that pet_photo_url reaches the <img>. Radix only mounts
    // AvatarImage once the image loads, which jsdom never does, so every row falls
    // back to initials regardless of photo. That path needs a browser-level test.
  })

  it('keeps the pet name truncating and value control on the right', async () => {
    habitsDayApi.getHabitDayEntries.mockResolvedValue({
      habit: baseHabit,
      date: '2026-04-08',
      entries: [
        {
          pet_id: 101,
          pet_name: 'Milo',
          pet_photo_url: null,
          value_int: null,
          is_current_pet: true,
          has_entry: false,
        },
      ],
    })

    renderDialog()

    await waitFor(() => {
      expect(screen.getByText('Milo')).toBeInTheDocument()
    })

    const label = screen.getByText('Milo')
    expect(label.className).toContain('truncate')

    // Value control wrapper keeps w-40 shrink-0 (rendered in portal, so query document.body)
    const controlWrapper = document.body.querySelector('.w-40.shrink-0')
    expect(controlWrapper).not.toBeNull()
  })

  it('shows initials fallback when pet has no photo', async () => {
    habitsDayApi.getHabitDayEntries.mockResolvedValue({
      habit: baseHabit,
      date: '2026-04-08',
      entries: [
        {
          pet_id: 102,
          pet_name: 'Luna',
          pet_photo_url: null,
          value_int: null,
          is_current_pet: true,
          has_entry: false,
        },
      ],
    })

    renderDialog()

    await waitFor(() => {
      expect(screen.getByText('Luna')).toBeInTheDocument()
    })

    expect(screen.getByText('LU')).toBeInTheDocument()
    const avatars = document.body.querySelectorAll('[data-slot="avatar"]')
    expect(avatars).toHaveLength(1)
  })
})
