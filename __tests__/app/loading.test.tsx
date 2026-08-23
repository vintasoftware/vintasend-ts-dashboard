/**
 * Tests for the notifications loading skeleton.
 */

import { render, screen } from '@testing-library/react';
import LoadingDefault, { NotificationsLoadingFallback } from '@/app/loading';

describe('NotificationsLoadingFallback', () => {
  it('renders a table-shaped skeleton so the layout does not jump on load', () => {
    const { container } = render(<NotificationsLoadingFallback />);

    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(container.querySelectorAll('thead th')).toHaveLength(6);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('is also the route-level default export Next renders', () => {
    expect(LoadingDefault).toBe(NotificationsLoadingFallback);
  });
});
