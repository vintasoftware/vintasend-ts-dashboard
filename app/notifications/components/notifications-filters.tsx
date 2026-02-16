'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NotificationFilters } from '@/lib/notifications/types';
import type { NotificationStatus } from 'vintasend/dist/types/notification-status';
import type { NotificationType } from 'vintasend/dist/types/notification-type';


interface NotificationsFiltersProps {
  onFiltersChange?: (filters: NotificationFilters) => void;
  isLoading?: boolean;
  initialFilters?: NotificationFilters;
}

const NOTIFICATION_STATUSES: NotificationStatus[] = ['PENDING_SEND', 'SENT', 'FAILED', 'READ', 'CANCELLED'];
const NOTIFICATION_TYPES: NotificationType[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];

/**
 * Filter bar for notifications list.
 * Allows filtering by status, type, and free-text search.
 * Search input is debounced (300ms) before calling the change callback.
 *
 * @param onFiltersChange - Callback invoked when filters change (after debounce for search)
 * @param isLoading - Whether data is currently loading
 * @param initialFilters - Initial filter values
 */
export function NotificationsFilters({
  onFiltersChange,
  isLoading = false,
  initialFilters,
}: NotificationsFiltersProps) {
  const [status, setStatus] = useState<string>(initialFilters?.status ?? 'all');
  const [notificationType, setNotificationType] = useState<string>(initialFilters?.notificationType ?? 'all');
  const [search, setSearch] = useState<string>(initialFilters?.search ?? '');

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);

      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer for debounced callback
      debounceTimerRef.current = setTimeout(() => {
        const filters: NotificationFilters = {};
        if (status !== 'all') filters.status = status as NotificationStatus;
        if (notificationType !== 'all') filters.notificationType = notificationType as NotificationType;
        if (value) filters.search = value;

        onFiltersChange?.(filters);
      }, 300);
    },
    [status, notificationType, onFiltersChange]
  );

  // Handle status change
  const handleStatusChange = (value: string) => {
    setStatus(value);

    // Clear search debounce timer and fire immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const filters: NotificationFilters = {};
    if (value !== 'all') filters.status = value as NotificationStatus;
    if (notificationType !== 'all') filters.notificationType = notificationType as NotificationType;
    if (search) filters.search = search;

    onFiltersChange?.(filters);
  };

  // Handle type change
  const handleTypeChange = (value: string) => {
    setNotificationType(value);

    // Clear search debounce timer and fire immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const filters: NotificationFilters = {};
    if (status !== 'all') filters.status = status as NotificationStatus;
    if (value !== 'all') filters.notificationType = value as NotificationType;
    if (search) filters.search = search;

    onFiltersChange?.(filters);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 border border-input rounded-lg bg-background sm:flex-row sm:items-end sm:gap-2">
      {/* Search Input */}
      <div className="flex-1 min-w-0">
        <label htmlFor="search-notifications" className="text-sm font-medium text-muted-foreground mb-2 block">
          Search
        </label>
        <Input
          id="search-notifications"
          placeholder="Search by title, ID, or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          disabled={isLoading}
          data-testid="search-input"
        />
      </div>

      {/* Status Select */}
      <div className="w-full sm:w-auto">
        <label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground mb-2 block">
          Status
        </label>
        <Select value={status} onValueChange={handleStatusChange} disabled={isLoading}>
          <SelectTrigger id="status-filter" data-testid="status-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {NOTIFICATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type Select */}
      <div className="w-full sm:w-auto">
        <label htmlFor="type-filter" className="text-sm font-medium text-muted-foreground mb-2 block">
          Type
        </label>
        <Select value={notificationType} onValueChange={handleTypeChange} disabled={isLoading}>
          <SelectTrigger id="type-filter" data-testid="type-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {NOTIFICATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
