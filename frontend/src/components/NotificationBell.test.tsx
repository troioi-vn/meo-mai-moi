import { render } from '@testing-library/react';
import { NotificationBell } from './NotificationBell';
import { BrowserRouter as Router } from 'react-router-dom';

// Mock the API module to prevent import errors during basic render test
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('NotificationBell', () => {
  test('renders without crashing', () => {
    render(
      <Router>
        <NotificationBell />
      </Router>
    );
  });
});