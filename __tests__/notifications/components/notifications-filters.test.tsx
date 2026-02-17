/**
 * Tests for the NotificationsFilters component.
 * Tests filter changes, search debouncing, and form interactions.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsFilters } from '@/app/notifications/components/notifications-filters';

describe('NotificationsFilters — Phase 3', () => {
  describe('3.4: Filter Changes', () => {
    it('renders all filter controls', () => {
      render(<NotificationsFilters />);

      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('status-select')).toBeInTheDocument();
      expect(screen.getByTestId('type-select')).toBeInTheDocument();
    });

    it('initializes with provided filter values', () => {
      render(
        <NotificationsFilters
          initialFilters={{
            status: 'PENDING_SEND',
            notificationType: 'SMS',
            search: 'test',
          }}
        />
      );

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput.value).toBe('test');
    });

    it('has all required filter controls', () => {
      render(<NotificationsFilters />);

      const statusSelect = screen.getByTestId('status-select');
      const typeSelect = screen.getByTestId('type-select');
      const searchInput = screen.getByTestId('search-input');

      // Select elements and search input should be present
      expect(statusSelect).toBeInTheDocument();
      expect(typeSelect).toBeInTheDocument();
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('3.6: Search Debouncing', () => {
    it('debounces search input before calling callback', async () => {
      const user = userEvent.setup();
      const handleFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={handleFiltersChange} />);

      const searchInput = screen.getByTestId('search-input');

      // Type some text
      await user.type(searchInput, 'test');

      // Callback should not be called immediately
      expect(handleFiltersChange).not.toHaveBeenCalled();

      // Wait for debounce to fire (300ms)
      await waitFor(
        () => {
          expect(handleFiltersChange).toHaveBeenCalledWith({ search: 'test' });
        },
        { timeout: 500 }
      );
    });

    it('fires callback after 300ms of inactivity', async () => {
      const user = userEvent.setup();
      const handleFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={handleFiltersChange} />);

      const searchInput = screen.getByTestId('search-input');

      // Type characters one by one
      await user.type(searchInput, 'test query');

      // Should not have called yet (still within debounce)
      expect(handleFiltersChange).not.toHaveBeenCalled();

      // Wait for debounce to fire
      await waitFor(
        () => {
          expect(handleFiltersChange).toHaveBeenCalledWith({
            search: 'test query',
          });
        },
        { timeout: 500 }
      );
    });

    it('cancels previous debounce when typing continues', async () => {
      const user = userEvent.setup();
      const handleFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={handleFiltersChange} />);

      const searchInput = screen.getByTestId('search-input');

      // Type "hello"
      await user.type(searchInput, 'hello');

      // Small delay, then type " world"
      await new Promise((resolve) => setTimeout(resolve, 100));
      await user.type(searchInput, ' world');

      // Wait for final debounce to fire
      await waitFor(
        () => {
          expect(handleFiltersChange).toHaveBeenCalledTimes(1);
          expect(handleFiltersChange).toHaveBeenCalledWith({
            search: 'hello world',
          });
        },
        { timeout: 500 }
      );
    });

    it('includes other filters in search callback', async () => {
      const user = userEvent.setup();
      const handleFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={handleFiltersChange}
          initialFilters={{ status: 'SENT' }}
        />
      );

      const searchInput = screen.getByTestId('search-input');

      await user.type(searchInput, 'test');

      await waitFor(
        () => {
          expect(handleFiltersChange).toHaveBeenCalledWith({
            status: 'SENT',
            search: 'test',
          });
        },
        { timeout: 500 }
      );
    });

    it('clears search while maintaining other filters', async () => {
      const user = userEvent.setup();
      const handleFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={handleFiltersChange}
          initialFilters={{
            status: 'SENT',
            notificationType: 'EMAIL',
            search: 'test',
          }}
        />
      );

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // Clear the search
      await user.clear(searchInput);

      await waitFor(
        () => {
          expect(handleFiltersChange).toHaveBeenCalledWith({
            status: 'SENT',
            notificationType: 'EMAIL',
          });
        },
        { timeout: 500 }
      );
    });
  });

  describe('Loading State', () => {
    it('disables all inputs when isLoading=true', () => {
      render(<NotificationsFilters isLoading={true} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      const statusSelect = screen.getByTestId('status-select');
      const typeSelect = screen.getByTestId('type-select');

      expect(searchInput.disabled).toBe(true);
      expect(statusSelect).toHaveAttribute('disabled');
      expect(typeSelect).toHaveAttribute('disabled');
    });

    it('enables all inputs when isLoading=false', () => {
      render(<NotificationsFilters isLoading={false} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      const statusSelect = screen.getByTestId('status-select');
      const typeSelect = screen.getByTestId('type-select');

      expect(searchInput.disabled).toBe(false);
      expect(statusSelect).not.toHaveAttribute('disabled');
      expect(typeSelect).not.toHaveAttribute('disabled');
    });
  });

  describe('Accessibility', () => {
    it('provides labels for all inputs', () => {
      render(<NotificationsFilters />);

      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
    });

    it('has descriptive placeholder text', () => {
      render(<NotificationsFilters />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput.placeholder).toContain('Search by title');
    });
  });
});


describe('NotificationsFilters — Phase 3', () => {
  describe('3.4: Filter Changes', () => {
    it('renders all filter controls', () => {
      render(<NotificationsFilters />);

      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('status-select')).toBeInTheDocument();
      expect(screen.getByTestId('type-select')).toBeInTheDocument();
    });

    it('has status select rendered', () => {
      const handleFiltersChange = jest.fn();
      render(<NotificationsFilters onFiltersChange={handleFiltersChange} />);

      const statusSelect = screen.getByTestId('status-select');
      expect(statusSelect).toBeInTheDocument();
      // Verify it has proper accessibility attributes
      expect(statusSelect).toHaveAttribute('role', 'combobox');
    });

    it('has type select rendered', () => {
      const handleFiltersChange = jest.fn();
      render(<NotificationsFilters onFiltersChange={handleFiltersChange} />);

      const typeSelect = screen.getByTestId('type-select');
      expect(typeSelect).toBeInTheDocument();
      // Verify it has proper accessibility attributes
      expect(typeSelect).toHaveAttribute('role', 'combobox');
    });

    it('displays initial filter values', () => {
      render(
        <NotificationsFilters
          initialFilters={{
            status: 'SENT',
            notificationType: 'SMS',
          }}
        />
      );

      // Status select should show SENT
      const statusSelect = screen.getByTestId('status-select');
      expect(statusSelect).toHaveTextContent('SENT');

      // Type select should show SMS
      const typeSelect = screen.getByTestId('type-select');
      expect(typeSelect).toHaveTextContent('SMS');
    });

    it('initializes with provided filter values', () => {
      render(
        <NotificationsFilters
          initialFilters={{
            status: 'PENDING_SEND',
            notificationType: 'SMS',
            search: 'test',
          }}
        />
      );

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput.value).toBe('test');
    });
  });

  describe('3.6: Search Debouncing', () => {
    it('debounces search input before calling callback', async () => {
      const user = userEvent.setup();
      const handleFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={handleFiltersChange} />);

      const searchInput = screen.getByTestId('search-input');

      // Type some text
      await user.type(searchInput, 'test');

      // Callback should not be called immediately
      expect(handleFiltersChange).not.toHaveBeenCalled();

      // Wait for debounce to fire (300ms)
      await waitFor(
        () => {
          expect(handleFiltersChange).toHaveBeenCalledWith({ search: 'test' });
        },
        { timeout: 500 }
      );
    });

    it('fires callback after 300ms of inactivity', async () => {
      const user = userEvent.setup();
      const handleFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={handleFiltersChange} />);

      const searchInput = screen.getByTestId('search-input');

      // Type characters one by one
      await user.type(searchInput, 'test query');

      // Should not have called yet (still within debounce)
      expect(handleFiltersChange).not.toHaveBeenCalled();

      // Wait for debounce to fire
      await waitFor(
        () => {
          expect(handleFiltersChange).toHaveBeenCalledWith({
            search: 'test query',
          });
        },
        { timeout: 500 }
      );
    });

    it('cancels previous debounce when typing continues', async () => {
      const user = userEvent.setup();
      const handleFiltersChange = jest.fn();

      render(<NotificationsFilters onFiltersChange={handleFiltersChange} />);

      const searchInput = screen.getByTestId('search-input');

      // Type "hello"
      await user.type(searchInput, 'hello');

      // Small delay, then type " world"
      await new Promise((resolve) => setTimeout(resolve, 100));
      await user.type(searchInput, ' world');

      // Wait for final debounce to fire
      await waitFor(
        () => {
          expect(handleFiltersChange).toHaveBeenCalledTimes(1);
          expect(handleFiltersChange).toHaveBeenCalledWith({
            search: 'hello world',
          });
        },
        { timeout: 500 }
      );
    });

    it('includes other filters in search callback', async () => {
      const user = userEvent.setup();
      const handleFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={handleFiltersChange}
          initialFilters={{ status: 'SENT' }}
        />
      );

      const searchInput = screen.getByTestId('search-input');

      await user.type(searchInput, 'test');

      await waitFor(
        () => {
          expect(handleFiltersChange).toHaveBeenCalledWith({
            status: 'SENT',
            search: 'test',
          });
        },
        { timeout: 500 }
      );
    });

    it('select inputs are accessible with labels', () => {
      render(<NotificationsFilters />);

      // Status select should have associated label
      const statusLabel = screen.getByText('Status');
      expect(statusLabel).toBeInTheDocument();
      const statusSelect = screen.getByTestId('status-select');
      expect(statusSelect).toHaveAttribute('id', 'status-filter');

      // Type select should have associated label
      const typeLabel = screen.getByText('Type');
      expect(typeLabel).toBeInTheDocument();
      const typeSelect = screen.getByTestId('type-select');
      expect(typeSelect).toHaveAttribute('id', 'type-filter');
    });

    it('clears search while maintaining other filters', async () => {
      const user = userEvent.setup();
      const handleFiltersChange = jest.fn();

      render(
        <NotificationsFilters
          onFiltersChange={handleFiltersChange}
          initialFilters={{
            status: 'SENT',
            notificationType: 'EMAIL',
            search: 'test',
          }}
        />
      );

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // Clear the search
      await user.clear(searchInput);

      await waitFor(
        () => {
          expect(handleFiltersChange).toHaveBeenCalledWith({
            status: 'SENT',
            notificationType: 'EMAIL',
          });
        },
        { timeout: 500 }
      );
    });
  });

  describe('Loading State', () => {
    it('disables all inputs when isLoading=true', () => {
      render(<NotificationsFilters isLoading={true} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      const statusSelect = screen.getByTestId('status-select');
      const typeSelect = screen.getByTestId('type-select');

      expect(searchInput.disabled).toBe(true);
      expect(statusSelect).toHaveAttribute('disabled');
      expect(typeSelect).toHaveAttribute('disabled');
    });

    it('enables all inputs when isLoading=false', () => {
      render(<NotificationsFilters isLoading={false} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      const statusSelect = screen.getByTestId('status-select');
      const typeSelect = screen.getByTestId('type-select');

      expect(searchInput.disabled).toBe(false);
      expect(statusSelect).not.toHaveAttribute('disabled');
      expect(typeSelect).not.toHaveAttribute('disabled');
    });
  });

  describe('Accessibility', () => {
    it('provides labels for all inputs', () => {
      render(<NotificationsFilters />);

      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
    });

    it('has descriptive placeholder text', () => {
      render(<NotificationsFilters />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput.placeholder).toContain('Search by title');
    });
  });
});
