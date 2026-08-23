/**
 * Tests for the auth status indicator.
 */

const useAuth = jest.fn();

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => useAuth(),
}));

import { render, screen } from '@testing-library/react';
import { AuthStatus } from '@/app/components/auth-status';
import type { AuthUser } from '@/lib/auth/types';

const authUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  imageUrl: 'https://img.clerk.com/ada.png',
  ...overrides,
});

const withAuth = (user: AuthUser | null, isAuthenticated = !!user) => {
  useAuth.mockReturnValue({
    user,
    isAuthenticated,
    signOutUrl: '/sign-out',
    signInUrl: '/sign-in',
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuthStatus', () => {
  it('offers a sign-in link to an anonymous visitor', () => {
    withAuth(null);

    render(<AuthStatus />);

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
  });

  it('offers a sign-in link when a user object lingers but the session is gone', () => {
    withAuth(authUser(), false);

    render(<AuthStatus />);

    expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows the signed-in name, email, avatar and sign-out link', () => {
    withAuth(authUser());

    render(<AuthStatus />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByAltText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign Out' })).toHaveAttribute('href', '/sign-out');
  });

  it('labels the avatar generically when the account has no name', () => {
    withAuth(authUser({ name: null }));

    render(<AuthStatus />);

    expect(screen.getByAltText('User avatar')).toBeInTheDocument();
  });

  it('omits the avatar and the optional text when those fields are empty', () => {
    withAuth(authUser({ name: null, email: null, imageUrl: null }));

    render(<AuthStatus />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign Out' })).toBeInTheDocument();
  });
});
