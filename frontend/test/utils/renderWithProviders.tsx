// Centralized Testing Library helpers with providers
// This file re-exports the canonical helpers from src/test-utils to provide
// a stable import path for tests: `test/utils/renderWithProviders`

export {
  render as renderWithProviders,
  renderWithRouter,
  userEvent,
} from '../../src/test-utils'

export * from '@testing-library/react'
