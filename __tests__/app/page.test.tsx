/**
 * Tests for the notifications route.
 *
 * The page no longer parses search params or fetches anything — the core's
 * hooks read the query string themselves — so all that is left to check is the
 * Suspense boundary, which Next requires around anything calling
 * `useSearchParams`. Without it the whole route silently opts out of static
 * rendering, which is the kind of regression nothing else would catch.
 */

jest.mock('@/app/components/notifications-page-client', () => ({
  NotificationsPageClient: () => <div data-testid="page-client" />,
}));

import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import NotificationsPage from '@/app/page';
import { NotificationsLoadingFallback } from '@/app/loading';

describe('NotificationsPage', () => {
  it('wraps the client component in a Suspense boundary', () => {
    const page = NotificationsPage() as ReactElement<Record<string, unknown>>;

    expect(page.props.fallback).toEqual(<NotificationsLoadingFallback />);
  });

  it('renders the client component', () => {
    render(NotificationsPage());

    expect(screen.getByTestId('page-client')).toBeInTheDocument();
  });

  it('takes no props, so the route needs no server-side fetch', () => {
    expect(NotificationsPage).toHaveLength(0);
  });
});
