import { describe, it, expect } from 'vite-plus/test'
import { screen } from '@testing-library/react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { renderWithRouter } from '@/testing'
import { PrivateRoute } from '@/App'

function ProtectedContent() {
  return <div>Protected content</div>
}

function LocationProbe() {
  const location = useLocation()
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  )
}

describe('PrivateRoute redirect preservation', () => {
  it('redirects unauthenticated users to login with encoded return path', () => {
    renderWithRouter(
      <Routes>
        <Route
          path="/login"
          element={
            <>
              <LocationProbe />
              <div>Login page</div>
            </>
          }
        />
        <Route
          path="/settings/notifications"
          element={
            <PrivateRoute>
              <ProtectedContent />
            </PrivateRoute>
          }
        />
      </Routes>,
      {
        initialEntries: [
          '/settings/notifications?unsubscribe=1&user=1&type=pet_birthday&token=abc',
        ],
        initialAuthState: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
        },
      }
    )

    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/login?redirect=%2Fsettings%2Fnotifications%3Funsubscribe%3D1%26user%3D1%26type%3Dpet_birthday%26token%3Dabc'
    )
  })
})
