/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://dashboard.test/notifications"}
 */

/**
 * Tests for the notifications error boundary.
 *
 * The boundary is what a user sees when the API is down, so it has to log for
 * operators, offer a way back, and keep the raw error out of production output.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationsError from '@/app/error';

const renderBoundary = (error = new Error('API unreachable'), reset = jest.fn()) => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const result = render(<NotificationsError error={error} reset={reset} />);
  return { ...result, reset, consoleError };
};

const withNodeEnv = (value: string, run: () => void) => {
  const descriptor = Object.getOwnPropertyDescriptor(process.env, 'NODE_ENV');
  Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true });
  try {
    run();
  } finally {
    if (descriptor) Object.defineProperty(process.env, 'NODE_ENV', descriptor);
  }
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('NotificationsError', () => {
  it('explains the failure and lists recovery suggestions', () => {
    renderBoundary();

    expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    expect(screen.getByText('What you can try:')).toBeInTheDocument();
    expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
  });

  it('logs the error so it reaches monitoring', () => {
    const error = new Error('API unreachable');
    const { consoleError } = renderBoundary(error);

    expect(consoleError).toHaveBeenCalledWith('Notifications page error:', error);
  });

  it('calls reset when the user retries', async () => {
    const interaction = userEvent.setup();
    const { reset } = renderBoundary();

    await interaction.click(screen.getByRole('button', { name: /Try Again/ }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('navigates away when the user chooses to go back to the dashboard', async () => {
    const interaction = userEvent.setup();
    const { consoleError } = renderBoundary();

    await interaction.click(screen.getByRole('button', { name: 'Go to Dashboard' }));

    // jsdom refuses to navigate and locks `window.location` against stubbing, so
    // the observable signal is its "navigation not implemented" report. It only
    // fires for a real location change, which is what the handler is for.
    expect(
      consoleError.mock.calls.some((call) =>
        String(call[0]).includes('Not implemented: navigation'),
      ),
    ).toBe(true);
  });

  it('shows the raw message in development', () => {
    withNodeEnv('development', () => {
      renderBoundary(new Error('connect ECONNREFUSED 127.0.0.1:3333'));

      expect(screen.getByText('Error details')).toBeInTheDocument();
      expect(screen.getByText('connect ECONNREFUSED 127.0.0.1:3333')).toBeInTheDocument();
    });
  });

  it('hides the raw message in production', () => {
    withNodeEnv('production', () => {
      renderBoundary(new Error('connect ECONNREFUSED 127.0.0.1:3333'));

      expect(screen.queryByText('Error details')).not.toBeInTheDocument();
      expect(screen.queryByText('connect ECONNREFUSED 127.0.0.1:3333')).not.toBeInTheDocument();
    });
  });
});
