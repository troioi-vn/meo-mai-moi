import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import RegisterPage from '@/pages/RegisterPage'
import LoginPage from '@/pages/LoginPage'
import EmailVerificationPage from '@/pages/EmailVerificationPage'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

const navigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal()
    return {
        ...(actual as object),
        useNavigate: () => navigate,
    }
})

describe('Email Verification Flow Integration', () => {
    let user: ReturnType<typeof userEvent.setup>

    beforeEach(() => {
        user = userEvent.setup()
        vi.clearAllMocks()

        // Mock open registration by default
        server.use(
            http.get('http://localhost:3000/api/settings/public', () => {
                return HttpResponse.json({
                    data: {
                        invite_only_enabled: false,
                    },
                })
            })
        )
    })

    it('completes full registration to verification to login flow', async () => {
        // Step 1: Register a new user
        renderWithRouter(<RegisterPage />, { route: '/register' })

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument()
        })

        await user.type(screen.getByLabelText(/name/i), 'Integration Test User')
        await user.type(screen.getByLabelText(/email/i), 'integration@example.com')
        await user.type(screen.getByLabelText(/^Password$/i), 'password123')
        await user.type(screen.getByLabelText(/confirm password/i), 'password123')
        await user.click(screen.getByRole('button', { name: /register/i }))

        // Should show email verification prompt
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
            expect(screen.getByText(/we have sent you verification email/i)).toBeInTheDocument()
        })

        // Step 2: Test resend verification email
        await user.click(screen.getByRole('button', { name: /resend verification email/i }))

        await waitFor(() => {
            expect(screen.getAllByText(/we have sent you verification email/i)).toHaveLength(2)
        })

        // Step 3: Simulate clicking verification link (navigate to verification page)
        renderWithRouter(<EmailVerificationPage />, {
            initialEntries: ['/email/verify/1/valid-hash?expires=1234567890&signature=valid-signature'],
            routes: [
                { path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }
            ]
        })

        // Should show success state
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /email verified/i })).toBeInTheDocument()
            expect(screen.getByText(/your email has been successfully verified/i)).toBeInTheDocument()
        })

        // Should auto-redirect to dashboard
        await waitFor(() => {
            expect(navigate).toHaveBeenCalledWith('/account/pets')
        }, { timeout: 3000 })
    })

    it('handles login attempt with unverified email', async () => {
        // Mock login response for unverified user
        server.use(
            http.post('http://localhost:3000/api/login', () => {
                return HttpResponse.json({
                    data: {
                        access_token: 'mock-token-unverified',
                        token_type: 'Bearer',
                        email_verified: false,
                    }
                })
            })
        )

        renderWithRouter(<LoginPage />, { route: '/login' })

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()
        })

        await user.type(screen.getByLabelText(/email/i), 'unverified@example.com')
        await user.type(screen.getByLabelText(/password/i), 'password123')
        await user.click(screen.getByRole('button', { name: /login/i }))

        // Should show email verification prompt instead of redirecting
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
            expect(screen.getByText(/please verify your email address before accessing/i)).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument()
        })

        // Test back to login functionality
        await user.click(screen.getByRole('button', { name: /back to login/i }))

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()
        })
    })

    it('handles verification status check during login flow', async () => {
        // Mock login response for unverified user
        server.use(
            http.post('http://localhost:3000/api/login', () => {
                return HttpResponse.json({
                    data: {
                        access_token: 'mock-token-unverified',
                        token_type: 'Bearer',
                        email_verified: false,
                    }
                })
            }),
            // Mock verification status check that returns verified
            http.get('http://localhost:3000/api/email/verification-status', () => {
                return HttpResponse.json({
                    data: {
                        verified: true,
                        email: 'nowverified@example.com',
                    }
                })
            }),
            // Mock user data fetch after verification
            http.get('http://localhost:3000/api/users/me', () => {
                return HttpResponse.json({
                    data: {
                        id: 1,
                        name: 'Test User',
                        email: 'nowverified@example.com',
                        avatar_url: null,
                    }
                })
            })
        )

        renderWithRouter(<LoginPage />, { route: '/login' })

        await user.type(screen.getByLabelText(/email/i), 'nowverified@example.com')
        await user.type(screen.getByLabelText(/password/i), 'password123')
        await user.click(screen.getByRole('button', { name: /login/i }))

        // Should show verification prompt first
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
        })

        // Click "I've verified my email" button
        await user.click(screen.getByRole('button', { name: /i've verified my email/i }))

        // Should call navigate to dashboard since verification status is now true
        await waitFor(() => {
            expect(navigate).toHaveBeenCalledWith('/account/pets')
        })
    })

    it('handles expired verification link gracefully', async () => {
        server.use(
            http.get('http://localhost:3000/api/email/verify/:id/:hash', () => {
                return HttpResponse.json(
                    { message: 'Verification link has expired.' },
                    { status: 403 }
                )
            })
        )

        renderWithRouter(<EmailVerificationPage />, {
            initialEntries: ['/email/verify/1/expired-hash?expires=1234567890&signature=expired-signature'],
            routes: [
                { path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }
            ]
        })

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument()
            expect(screen.getByText(/invalid or expired verification link/i)).toBeInTheDocument()
        })

        // Test navigation options
        expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /register again/i })).toBeInTheDocument()

        // Test register again button
        await user.click(screen.getByRole('button', { name: /register again/i }))
        expect(navigate).toHaveBeenCalledWith('/register')
    })

    it('handles network errors during verification gracefully', async () => {
        server.use(
            http.get('http://localhost:3000/api/email/verify/:id/:hash', () => {
                return HttpResponse.error()
            })
        )

        renderWithRouter(<EmailVerificationPage />, {
            initialEntries: ['/email/verify/1/valid-hash?expires=1234567890&signature=valid-signature'],
            routes: [
                { path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }
            ]
        })

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument()
            expect(screen.getByText(/failed to verify email/i)).toBeInTheDocument()
        })
    })
})