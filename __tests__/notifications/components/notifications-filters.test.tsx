/**
 * Tests for NotificationsFilters component.
 * Validates rendered controls, initial values, debounced text filters and loading state.
 */

import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsFilters } from '@/app/components/notifications-filters';

/** Matches the debounce window in notifications-filters.tsx. */
const DEBOUNCE_MS = 300;

describe('NotificationsFilters', () => {
  describe('rendering and initial values', () => {
    it('renders core controls', () => {
      render(<NotificationsFilters />);

      expect(screen.getByTestId('status-select')).toBeInTheDocument();
      expect(screen.getByTestId('type-select')).toBeInTheDocument();
      expect(screen.getByLabelText('Adapter Used')).toBeInTheDocument();
      expect(screen.getByLabelText('Recipient ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Body Template')).toBeInTheDocument();
      expect(screen.getByLabelText('Subject Template')).toBeInTheDocument();
      expect(screen.getByLabelText('Context')).toBeInTheDocument();
      expect(screen.getByText('Created At')).toBeInTheDocument();
      expect(screen.getByText('Sent At')).toBeInTheDocument();
    });

    it('initializes with provided filter values', () => {
      render(
        <NotificationsFilters
          initialFilters={{
            status: 'PENDING_SEND',
            notificationType: 'SMS',
            adapterUsed: 'sendgrid',
            userId: 'user-123',
            bodyTemplate: 'welcome-body',
            subjectTemplate: 'welcome-subject',
            contextName: 'taskAssignment',
          }}
        />,
      );

      expect(screen.getByTestId('status-select')).toHaveTextContent('PENDING_SEND');
      expect(screen.getByTestId('type-select')).toHaveTextContent('SMS');
      expect(screen.getByLabelText('Adapter Used')).toHaveValue('sendgrid');
      expect(screen.getByLabelText('Recipient ID')).toHaveValue('user-123');
      expect(screen.getByLabelText('Body Template')).toHaveValue('welcome-body');
      expect(screen.getByLabelText('Subject Template')).toHaveValue('welcome-subject');
      expect(screen.getByLabelText('Context')).toHaveValue('taskAssignment');
    });
  });

  describe('debounced text filters', () => {
    // These drive a real 300ms debounce. On real timers the assertions raced the
    // wall clock and flaked whenever the machine was loaded, so the debounce is
    // stepped explicitly instead of waited out.
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const flushDebounce = () => {
      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });
    };

    it('debounces adapterUsed input and calls callback after inactivity', async () => {
      const user = setupUser();
      const onFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={onFiltersChange} />);

      await user.type(screen.getByLabelText('Adapter Used'), 'sendgrid');

      // Still inside the debounce window: nothing has fired yet.
      expect(onFiltersChange).not.toHaveBeenCalled();

      flushDebounce();

      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith({ adapterUsed: 'sendgrid' });
    });

    it('includes existing select filters in debounced text callback', async () => {
      const user = setupUser();
      const onFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={onFiltersChange}
          initialFilters={{ status: 'SENT', notificationType: 'EMAIL' }}
        />,
      );

      await user.type(screen.getByLabelText('Body Template'), 'welcome-body');
      flushDebounce();

      expect(onFiltersChange).toHaveBeenCalledWith({
        status: 'SENT',
        notificationType: 'EMAIL',
        bodyTemplate: 'welcome-body',
      });
    });

    it('clears a text filter while preserving other active filters', async () => {
      const user = setupUser();
      const onFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={onFiltersChange}
          initialFilters={{
            status: 'SENT',
            notificationType: 'EMAIL',
            adapterUsed: 'sendgrid',
          }}
        />,
      );

      await user.clear(screen.getByLabelText('Adapter Used'));
      flushDebounce();

      expect(onFiltersChange).toHaveBeenCalledWith({
        status: 'SENT',
        notificationType: 'EMAIL',
      });
    });

    it('fires once for a burst of keystrokes rather than once per character', async () => {
      const user = setupUser();
      const onFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={onFiltersChange} />);

      const input = screen.getByLabelText('Recipient ID');
      await user.type(input, 'user');
      // Part-way through the window a new keystroke restarts the timer.
      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS - 100);
      });
      await user.type(input, '-123');
      flushDebounce();

      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith({ userId: 'user-123' });
    });
  });


  describe('select filters', () => {
    it('fires immediately when a status is picked, without waiting for the debounce', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={onFiltersChange} />);

      await user.click(screen.getByTestId('status-select'));
      await user.click(await screen.findByRole('option', { name: 'SENT' }));

      expect(onFiltersChange).toHaveBeenCalledWith({ status: 'SENT' });
    });

    it('fires immediately when a type is picked', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={onFiltersChange} />);

      await user.click(screen.getByTestId('type-select'));
      await user.click(await screen.findByRole('option', { name: 'EMAIL' }));

      expect(onFiltersChange).toHaveBeenCalledWith({ notificationType: 'EMAIL' });
    });

    it('drops the status filter entirely when reset to "All Statuses"', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={onFiltersChange}
          initialFilters={{ status: 'SENT', adapterUsed: 'mailgun' }}
        />,
      );

      await user.click(screen.getByTestId('status-select'));
      await user.click(await screen.findByRole('option', { name: 'All Statuses' }));

      // "all" is the sentinel for "no filter", so it must not reach the query.
      expect(onFiltersChange).toHaveBeenCalledWith({ adapterUsed: 'mailgun' });
    });

    it('drops the type filter when reset to "All Types"', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={onFiltersChange}
          initialFilters={{ notificationType: 'EMAIL' }}
        />,
      );

      await user.click(screen.getByTestId('type-select'));
      await user.click(await screen.findByRole('option', { name: 'All Types' }));

      expect(onFiltersChange).toHaveBeenCalledWith({});
    });
  });

  describe('tenant filter', () => {
    it('initialises and reports the tenant like the other text filters', () => {
      render(<NotificationsFilters initialFilters={{ tenant: 'acme' }} />);

      expect(screen.getByLabelText('Tenant')).toHaveValue('acme');
    });
  });

  describe('date range filters', () => {
    it('shows a placeholder when no range is set', () => {
      render(<NotificationsFilters />);

      expect(screen.getAllByText('Pick a date range')).toHaveLength(2);
    });

    it('renders a single date when only the start of a range is known', () => {
      render(<NotificationsFilters initialFilters={{ createdAtFrom: '2024-01-15T00:00:00.000Z' }} />);

      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    });

    it('renders both ends of a full range', () => {
      render(
        <NotificationsFilters
          initialFilters={{
            createdAtFrom: '2024-01-15T00:00:00.000Z',
            createdAtTo: '2024-01-31T00:00:00.000Z',
          }}
        />,
      );

      expect(screen.getByText('Jan 15, 2024 – Jan 31, 2024')).toBeInTheDocument();
    });

    it('renders a sent-at range independently of the created-at one', () => {
      render(
        <NotificationsFilters
          initialFilters={{
            sentAtFrom: '2024-02-01T00:00:00.000Z',
            sentAtTo: '2024-02-28T00:00:00.000Z',
          }}
        />,
      );

      expect(screen.getByText('Feb 01, 2024 – Feb 28, 2024')).toBeInTheDocument();
      expect(screen.getByText('Pick a date range')).toBeInTheDocument();
    });

    it('offers a clear button only once a range is set', () => {
      // Separate mounts, not a rerender: the ranges come from a useState
      // initialiser, which only runs the first time the component mounts.
      const { unmount } = render(<NotificationsFilters />);
      const withoutRange = screen.getAllByRole('button').length;
      unmount();

      render(<NotificationsFilters initialFilters={{ createdAtFrom: '2024-01-15T00:00:00.000Z' }} />);

      expect(screen.getAllByRole('button').length).toBe(withoutRange + 1);
    });

    it('clearing a created-at range reports the remaining filters', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={onFiltersChange}
          initialFilters={{ createdAtFrom: '2024-01-15T00:00:00.000Z', status: 'SENT' }}
        />,
      );

      const clear = screen
        .getAllByRole('button')
        .find((button) => button.querySelector('svg.lucide-x')) as HTMLElement;
      await user.click(clear);

      expect(onFiltersChange).toHaveBeenCalledWith({ status: 'SENT' });
      // Both range pickers are back to their placeholder.
      expect(screen.getAllByText('Pick a date range')).toHaveLength(2);
    });

    it('clearing a sent-at range reports the remaining filters', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={onFiltersChange}
          initialFilters={{ sentAtFrom: '2024-02-01T00:00:00.000Z', status: 'SENT' }}
        />,
      );

      const clear = screen
        .getAllByRole('button')
        .find((button) => button.querySelector('svg.lucide-x')) as HTMLElement;
      await user.click(clear);

      expect(onFiltersChange).toHaveBeenCalledWith({ status: 'SENT' });
    });

    it('sends both ends of a range as ISO timestamps', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={onFiltersChange}
          initialFilters={{
            createdAtFrom: '2024-01-15T00:00:00.000Z',
            createdAtTo: '2024-01-31T00:00:00.000Z',
          }}
        />,
      );

      await user.type(screen.getByLabelText('Adapter Used'), 'x');
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 50));

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAtFrom: '2024-01-15T00:00:00.000Z',
          createdAtTo: '2024-01-31T00:00:00.000Z',
        }),
      );
    });
  });

  describe('unmount', () => {
    it('does not fire a pending debounce after the component is gone', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onFiltersChange = jest.fn();

      const { unmount } = render(<NotificationsFilters onFiltersChange={onFiltersChange} />);
      await user.type(screen.getByLabelText('Adapter Used'), 'sendgrid');
      unmount();

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS * 2);
      });

      expect(onFiltersChange).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });


  describe('staying in step with the URL', () => {
    it('adopts filters that changed outside the bar, such as the back button', () => {
      const { rerender } = render(<NotificationsFilters initialFilters={{ adapterUsed: 'sendgrid' }} />);

      expect(screen.getByLabelText('Adapter Used')).toHaveValue('sendgrid');

      rerender(
        <NotificationsFilters
          initialFilters={{ adapterUsed: 'mailgun', status: 'FAILED', userId: 'user-9' }}
        />,
      );

      expect(screen.getByLabelText('Adapter Used')).toHaveValue('mailgun');
      expect(screen.getByLabelText('Recipient ID')).toHaveValue('user-9');
      expect(screen.getByTestId('status-select')).toHaveTextContent('FAILED');
    });

    it('clears the inputs when the filters are reset from outside', () => {
      const { rerender } = render(
        <NotificationsFilters
          initialFilters={{
            adapterUsed: 'sendgrid',
            bodyTemplate: 'body.pug',
            subjectTemplate: 'subject.pug',
            contextName: 'welcome',
            tenant: 'acme',
            notificationType: 'EMAIL',
            createdAtFrom: '2024-01-15T00:00:00.000Z',
            sentAtFrom: '2024-02-01T00:00:00.000Z',
          }}
        />,
      );

      rerender(<NotificationsFilters initialFilters={{}} />);

      expect(screen.getByLabelText('Adapter Used')).toHaveValue('');
      expect(screen.getByLabelText('Body Template')).toHaveValue('');
      expect(screen.getByLabelText('Subject Template')).toHaveValue('');
      expect(screen.getByLabelText('Context')).toHaveValue('');
      expect(screen.getByLabelText('Tenant')).toHaveValue('');
      expect(screen.getByTestId('type-select')).toHaveTextContent('All Types');
      expect(screen.getAllByText('Pick a date range')).toHaveLength(2);
    });

    it('does not re-seed when the incoming filters are the ones it just emitted', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onFiltersChange = jest.fn();

      const { rerender } = render(
        <NotificationsFilters onFiltersChange={onFiltersChange} initialFilters={{}} />,
      );

      await user.type(screen.getByLabelText('Adapter Used'), 'send');
      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      // The parent writes the emitted filters to the URL and hands them back.
      rerender(
        <NotificationsFilters
          onFiltersChange={onFiltersChange}
          initialFilters={{ adapterUsed: 'send' }}
        />,
      );

      // Meanwhile the user has kept typing; the round trip must not truncate it.
      await user.type(screen.getByLabelText('Adapter Used'), 'grid');
      expect(screen.getByLabelText('Adapter Used')).toHaveValue('sendgrid');

      jest.useRealTimers();
    });

    it('ignores a rerender that changes nothing', () => {
      const filters = { adapterUsed: 'sendgrid' };
      const { rerender } = render(<NotificationsFilters initialFilters={filters} />);

      // A new object with the same contents must not reset the field.
      rerender(<NotificationsFilters initialFilters={{ adapterUsed: 'sendgrid' }} />);

      expect(screen.getByLabelText('Adapter Used')).toHaveValue('sendgrid');
    });
  });

  describe('loading and accessibility', () => {
    it('disables all controls when isLoading=true', () => {
      render(<NotificationsFilters isLoading />);

      expect(screen.getByTestId('status-select')).toHaveAttribute('disabled');
      expect(screen.getByTestId('type-select')).toHaveAttribute('disabled');
      expect(screen.getByLabelText('Adapter Used')).toBeDisabled();
      expect(screen.getByLabelText('Recipient ID')).toBeDisabled();
      expect(screen.getByLabelText('Body Template')).toBeDisabled();
      expect(screen.getByLabelText('Subject Template')).toBeDisabled();
      expect(screen.getByLabelText('Context')).toBeDisabled();
    });

    it('exposes descriptive placeholders for text filters', () => {
      render(<NotificationsFilters />);

      expect(screen.getByLabelText('Adapter Used')).toHaveAttribute('placeholder', 'e.g. sendgrid');
      expect(screen.getByLabelText('Recipient ID')).toHaveAttribute('placeholder', 'Recipient ID');
      expect(screen.getByLabelText('Body Template')).toHaveAttribute('placeholder', 'Body template name');
      expect(screen.getByLabelText('Subject Template')).toHaveAttribute('placeholder', 'Subject template name');
      expect(screen.getByLabelText('Context')).toHaveAttribute('placeholder', 'Context');
    });
  });
});
