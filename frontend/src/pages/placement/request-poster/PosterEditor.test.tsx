import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithRouter, testQueryClient } from '@/testing'
import { server } from '@/testing/mocks/server'
import i18n from '@/i18n'
import { setupLocaleQueryInvalidation } from '@/lib/locale-query-invalidation'
import { PlacementPosterPage } from './PlacementPosterPage'
import { RequestDetailHeader } from '../request-detail/RequestDetailHeader'
import type { PlacementRequestDetail } from '@/types/placement'

const actions = {
  can_print_poster: true,
  can_respond: false,
  can_quick_respond: false,
  can_cancel_my_response: true,
  can_accept_responses: false,
  can_reject_responses: false,
  can_confirm_handover: false,
  can_finalize: false,
  can_delete_request: false,
}
const payload: PlacementRequestDetail = {
  id: 27,
  pet_id: 1,
  user_id: 999,
  request_type: 'permanent',
  status: 'open',
  notes: 'Original notes',
  notes_locale: 'en',
  notes_translation: { original_locale: 'en', viewer_locale: 'vi', is_translated: false },
  pet: { id: 1, name: 'Minnie', city: 'Hanoi', country: 'VN' },
  response_count: 0,
  viewer_role: 'helper',
  available_actions: actions,
  created_at: '',
  updated_at: '',
}
const photos = [
  {
    id: 10,
    url: '/display.jpg',
    medium_url: '/medium.jpg',
    thumb_url: '/thumb.jpg',
    is_primary: true,
  },
  { id: 11, url: '/display2.jpg', medium_url: '/medium2.jpg', is_primary: false },
]

beforeEach(() => {
  testQueryClient.clear()
  server.use(
    http.get('http://localhost:3000/api/placement-requests/27', () =>
      HttpResponse.json({ data: payload })
    )
  )
  server.use(
    http.get('http://localhost:3000/api/pets/1', () =>
      HttpResponse.json({ data: { id: 1, photos, sex: 'female', pet_type: { name: 'Cat' } } })
    )
  )
})
afterEach(async () => {
  await i18n.changeLanguage('en')
})

const renderPoster = (query = '') =>
  renderWithRouter(<PlacementPosterPage />, {
    route: `/requests/27/poster${query}`,
    routes: [{ path: '/requests/:id/poster', element: <PlacementPosterPage /> }],
  })

it('offers the poster to a helper who has placement-management capability', () => {
  renderWithRouter(<RequestDetailHeader request={payload} showOwnerTools={false} />)
  expect(screen.getByRole('link', { name: 'Poster' })).toHaveAttribute(
    'href',
    '/requests/27/poster'
  )
})
it('does not offer the poster to an unrelated viewer or for a closed listing', () => {
  const { unmount } = renderWithRouter(
    <RequestDetailHeader
      request={{ ...payload, available_actions: { ...actions, can_print_poster: false } }}
      showOwnerTools
    />
  )
  expect(screen.queryByRole('link', { name: 'Poster' })).not.toBeInTheDocument()
  unmount()
  renderWithRouter(<RequestDetailHeader request={{ ...payload, status: 'cancelled' }} />)
  expect(screen.queryByRole('link', { name: 'Poster' })).not.toBeInTheDocument()
})
it('prefers the medium conversion, restores focus from the URL and renders four tabs', async () => {
  const { user } = renderPoster('?photo=11&focus=20,80&tabs=1&paper=letter&lang=en')
  const photo = await screen.findByAltText('Minnie')
  expect(photo).toHaveAttribute('src', '/medium2.jpg')
  expect(photo).toHaveStyle({ objectPosition: '20% 80%' })
  expect(photo.closest('article')).toHaveAttribute('data-paper', 'letter')
  expect(photo.closest('article')?.querySelectorAll('.poster-tab')).toHaveLength(4)
  fireEvent.keyDown(screen.getByRole('group', { name: /Drag the photo/ }), { key: 'ArrowUp' })
  expect(photo).toHaveStyle({ objectPosition: '20% 78%' })
  await user.click(screen.getByRole('button', { name: 'Choose photo 1' }))
  expect(await screen.findByAltText('Minnie')).toHaveAttribute('src', '/medium.jpg')
  expect(screen.getByAltText('Minnie')).toHaveStyle({ objectPosition: '50% 50%' })
})
it('warns on removed and failed photos instead of silently replacing the shared crop', async () => {
  const { user } = renderPoster('?photo=999')
  expect(await screen.findByRole('alert')).toHaveTextContent('This photo is unavailable')
  expect(screen.getByRole('button', { name: /Print poster/ })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Choose photo 1' }))
  fireEvent.error(await screen.findByAltText('Minnie'))
  expect(screen.getByRole('alert')).toHaveTextContent('This photo is unavailable')
})
it('keeps poster-language fetching separate from UI cache after global invalidation', async () => {
  const languages: string[] = []
  server.use(
    http.get('http://localhost:3000/api/placement-requests/27', ({ request }) => {
      languages.push(request.headers.get('Accept-Language') ?? '')
      return HttpResponse.json({ data: payload })
    })
  )
  const uiKey = ['/api/placement-requests/27']
  testQueryClient.setQueryDefaults(uiKey, { gcTime: Infinity })
  testQueryClient.setQueryData(uiKey, { sentinel: 'UI payload' })
  const stop = setupLocaleQueryInvalidation(testQueryClient)
  try {
    renderPoster('?lang=vi')
    await screen.findByRole('heading', { name: /Minnie/ })
    expect(languages).toEqual(['vi'])
    expect(screen.getByText(/A translation is not ready/)).toBeInTheDocument()
    expect(screen.getByLabelText('Poster language')).toBeInTheDocument()
    expect(testQueryClient.getQueryData(uiKey)).toEqual({ sentinel: 'UI payload' })
    await i18n.changeLanguage('ru')
    await waitFor(() => {
      expect(languages.length).toBeGreaterThan(1)
    })
    expect(languages.every((language) => language === 'vi')).toBe(true)
    expect(i18n.language).toBe('ru')
  } finally {
    stop()
  }
})

describe('all poster languages', () => {
  it.each(['en', 'ru', 'uk', 'vi'])(
    'renders %s poster copy without changing the editor language',
    async (locale) => {
      renderPoster(`?lang=${locale}`)
      const heading = await screen.findByRole('heading', { name: /Minnie/ })
      expect(heading.closest('article')).toHaveAttribute('lang', locale)
      expect(heading).toHaveAccessibleName(
        i18n.getFixedT(locale)('placement:poster.headline.permanent', { name: 'Minnie' })
      )
      expect(screen.getByLabelText('Poster language')).toBeInTheDocument()
      expect(i18n.language).toBe('en')
    }
  )
})

it('prints a ready translation and removes the fallback notice', async () => {
  server.use(
    http.get('http://localhost:3000/api/placement-requests/27', () =>
      HttpResponse.json({
        data: {
          ...payload,
          notes_translation: {
            original_locale: 'en',
            viewer_locale: 'vi',
            is_translated: true,
            translated: 'Ghi chú đã dịch.',
          },
        },
      })
    )
  )
  renderPoster('?lang=vi')
  expect(await screen.findByText('Ghi chú đã dịch.')).toBeInTheDocument()
  expect(screen.queryByText(/A translation is not ready/)).not.toBeInTheDocument()
})

it('gets vaccination wording from the existing authorized sections response', async () => {
  server.use(
    http.get('http://localhost:3000/api/my-pets/sections', () =>
      HttpResponse.json({
        data: {
          owned: [],
          shared: [{ id: 1, health_summary: { vaccination_status: 'due_soon' } }],
          fostering_active: [],
          fostering_past: [],
          group_past: [],
          context: { mode: 'all' },
        },
      })
    )
  )
  renderWithRouter(<PlacementPosterPage />, {
    route: '/requests/27/poster?lang=en',
    routes: [{ path: '/requests/:id/poster', element: <PlacementPosterPage /> }],
    initialAuthState: {
      user: { id: 5, name: 'Volunteer', email: 'volunteer@example.test' },
      isAuthenticated: true,
      isLoading: false,
    },
  })
  const vaccination = i18n.getFixedT('en')('pets:profile.status.due_soon')
  expect(await screen.findByText(new RegExp(vaccination))).toBeInTheDocument()
})

it('responds to touch dragging through pointer events', async () => {
  renderPoster('?lang=en&photo=10&focus=50,50')
  const photo = await screen.findByAltText('Minnie')
  Object.defineProperties(photo, { naturalWidth: { value: 300 }, naturalHeight: { value: 400 } })
  const frame = screen.getByRole('group', { name: /Drag the photo/ })
  frame.getBoundingClientRect = () => ({
    width: 300,
    height: 200,
    top: 0,
    left: 0,
    right: 300,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  frame.setPointerCapture = () => {}
  // JSDOM has no PointerEvent implementation.
  const pointer = (type: string, x: number, y: number) => {
    const event = new Event(type, { bubbles: true })
    Object.defineProperties(event, {
      pointerId: { value: 1 },
      isPrimary: { value: true },
      button: { value: 0 },
      pointerType: { value: 'touch' },
      clientX: { value: x },
      clientY: { value: y },
    })
    fireEvent(frame, event)
  }
  pointer('pointerdown', 100, 100)
  pointer('pointermove', 100, 125)
  pointer('pointerup', 100, 125)
  expect(photo).toHaveStyle({ objectPosition: '50% 37.5%' })
})

it.each([undefined, null])(
  'uses the existing display URL when medium_url is %s',
  async (mediumUrl) => {
    server.use(
      http.get('http://localhost:3000/api/pets/1', () =>
        HttpResponse.json({
          data: {
            id: 1,
            photos: [
              { id: 10, url: '/display-fallback.jpg', medium_url: mediumUrl, is_primary: true },
            ],
          },
        })
      )
    )
    renderPoster('?lang=en&photo=10')
    expect(await screen.findByAltText('Minnie')).toHaveAttribute('src', '/display-fallback.jpg')
  }
)
