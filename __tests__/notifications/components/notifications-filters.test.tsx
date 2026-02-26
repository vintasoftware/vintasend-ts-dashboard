/**
 * Tests for NotificationsFilters component.
 * Validates rendered controls, initial values, debounced text filters and loading state.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsFilters } from '@/app/notifications/components/notifications-filters';

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
    it('debounces adapterUsed input and calls callback after inactivity', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={onFiltersChange} />);

      const adapterInput = screen.getByLabelText('Adapter Used');
      await user.type(adapterInput, 'sendgrid');

      expect(onFiltersChange).not.toHaveBeenCalled();

      await waitFor(
        () => {
          expect(onFiltersChange).toHaveBeenCalledWith({ adapterUsed: 'sendgrid' });
        },
        { timeout: 600 },
      );
    });

    it('includes existing select filters in debounced text callback', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={onFiltersChange}
          initialFilters={{ status: 'SENT', notificationType: 'EMAIL' }}
        />,
      );

      await user.type(screen.getByLabelText('Body Template'), 'welcome-body');

      await waitFor(
        () => {
          expect(onFiltersChange).toHaveBeenCalledWith({
            status: 'SENT',
            notificationType: 'EMAIL',
            bodyTemplate: 'welcome-body',
          });
        },
        { timeout: 600 },
      );
    });

    it('clears a text filter while preserving other active filters', async () => {
      const user = userEvent.setup();
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

      const adapterInput = screen.getByLabelText('Adapter Used');
      await user.clear(adapterInput);

      await waitFor(
        () => {
          expect(onFiltersChange).toHaveBeenCalledWith({
            status: 'SENT',
            notificationType: 'EMAIL',
          });
        },
        { timeout: 600 },
      );
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
