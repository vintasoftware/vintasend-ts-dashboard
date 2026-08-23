/**
 * Tests for the top navigation bar.
 *
 * The navbar is the only always-visible chrome, and it renders nothing at all
 * for an anonymous visitor — so the "no user" case is as load-bearing as the
 * signed-in one.
 */

const useAuth = jest.fn();

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => useAuth(),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopNavbar } from '@/app/components/top-navbar';
import type { AuthUser } from '@/lib/auth/types';

const withUser = (user: AuthUser | null, signOutUrl = '/sign-out') => {
  useAuth.mockReturnValue({ user, signOutUrl, signInUrl: '/sign-in', isAuthenticated: !!user });
};

const user = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  imageUrl: 'https://img.clerk.com/ada.png',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TopNavbar', () => {
  it('renders nothing when nobody is signed in', () => {
    withUser(null);

    const { container } = render(<TopNavbar />);

    expect(container).toBeEmptyDOMElement();
  });

  it('links the brand back to the dashboard root', () => {
    withUser(user());

    render(<TopNavbar />);

    expect(screen.getByRole('link', { name: 'Vintasend Dashboard' })).toHaveAttribute('href', '/');
  });

  it('shows the signed-in user and their avatar', () => {
    withUser(user());

    render(<TopNavbar />);

    expect(screen.getByRole('button', { name: /Ada Lovelace/ })).toBeInTheDocument();
    expect(screen.getByAltText('Ada Lovelace')).toBeInTheDocument();
  });

  it('falls back to the email when the account has no name', () => {
    withUser(user({ name: null }));

    render(<TopNavbar />);

    expect(screen.getByRole('button', { name: /ada@example.com/ })).toBeInTheDocument();
  });

  it('falls back to "User" when there is neither a name nor an email', () => {
    withUser(user({ name: null, email: null }));

    render(<TopNavbar />);

    expect(screen.getByRole('button', { name: /User/ })).toBeInTheDocument();
  });

  it('omits the avatar when the account has no image', () => {
    withUser(user({ imageUrl: null }));

    render(<TopNavbar />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('offers a sign-out link pointing at the strategy URL', async () => {
    withUser(user(), '/auth/logout');
    const interaction = userEvent.setup();

    render(<TopNavbar />);
    await interaction.click(screen.getByRole('button', { name: /Ada Lovelace/ }));

    const signOut = await screen.findByRole('menuitem', { name: /Sign Out/ });
    expect(signOut).toHaveAttribute('href', '/auth/logout');
  });

  it('shows the account details inside the menu', async () => {
    withUser(user());
    const interaction = userEvent.setup();

    render(<TopNavbar />);
    await interaction.click(screen.getByRole('button', { name: /Ada Lovelace/ }));

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
  });

  it('labels the menu entry "User" when the account has no name', async () => {
    withUser(user({ name: null }));
    const interaction = userEvent.setup();

    render(<TopNavbar />);
    await interaction.click(screen.getByRole('button', { name: /ada@example.com/ }));

    expect(await screen.findByText('User')).toBeInTheDocument();
  });
});
