'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';

interface NotificationsFiltersProps {
  onFiltersChange?: (filters: NotificationFilters) => void;
  isLoading?: boolean;
  initialFilters?: NotificationFilters;
}

const NOTIFICATION_STATUSES: NotificationStatus[] = ['PENDING_SEND', 'SENT', 'FAILED', 'READ', 'CANCELLED'];
const NOTIFICATION_TYPES: NotificationType[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];

/**
 * Builds a NotificationFilters object from the current filter state.
 */
function collectFilters({
  status,
  notificationType,
  adapterUsed,
  userId,
  bodyTemplate,
  subjectTemplate,
  contextName,
  createdAtRange,
  sentAtRange,
}: {
  status: string;
  notificationType: string;
  adapterUsed: string;
  userId: string;
  bodyTemplate: string;
  subjectTemplate: string;
  contextName: string;
  createdAtRange: DateRange | undefined;
  sentAtRange: DateRange | undefined;
}): NotificationFilters {
  const filters: NotificationFilters = {};
  if (status !== 'all') filters.status = status as NotificationStatus;
  if (notificationType !== 'all') filters.notificationType = notificationType as NotificationType;
  if (adapterUsed) filters.adapterUsed = adapterUsed;
  if (userId) filters.userId = userId;
  if (bodyTemplate) filters.bodyTemplate = bodyTemplate;
  if (subjectTemplate) filters.subjectTemplate = subjectTemplate;
  if (contextName) filters.contextName = contextName;
  if (createdAtRange?.from) filters.createdAtFrom = createdAtRange.from.toISOString();
  if (createdAtRange?.to) filters.createdAtTo = createdAtRange.to.toISOString();
  if (sentAtRange?.from) filters.sentAtFrom = sentAtRange.from.toISOString();
  if (sentAtRange?.to) filters.sentAtTo = sentAtRange.to.toISOString();
  return filters;
}

/**
 * Filter bar for notifications list.
 * Supports filtering by status, notification type, adapter, user, templates,
 * context name, and date ranges (created at, sent at).
 * Text inputs are debounced (300ms) before triggering the change callback.
 */
export function NotificationsFilters({
  onFiltersChange,
  isLoading = false,
  initialFilters,
}: NotificationsFiltersProps) {
  const [status, setStatus] = useState<string>(initialFilters?.status ?? 'all');
  const [notificationType, setNotificationType] = useState<string>(initialFilters?.notificationType ?? 'all');
  const [adapterUsed, setAdapterUsed] = useState<string>(initialFilters?.adapterUsed ?? '');
  const [userId, setUserId] = useState<string>(initialFilters?.userId ?? '');
  const [bodyTemplate, setBodyTemplate] = useState<string>(initialFilters?.bodyTemplate ?? '');
  const [subjectTemplate, setSubjectTemplate] = useState<string>(initialFilters?.subjectTemplate ?? '');
  const [contextName, setContextName] = useState<string>(initialFilters?.contextName ?? '');
  const [createdAtRange, setCreatedAtRange] = useState<DateRange | undefined>(() => {
    if (!initialFilters?.createdAtFrom && !initialFilters?.createdAtTo) return undefined;
    return {
      from: initialFilters?.createdAtFrom ? new Date(initialFilters.createdAtFrom) : undefined,
      to: initialFilters?.createdAtTo ? new Date(initialFilters.createdAtTo) : undefined,
    };
  });
  const [sentAtRange, setSentAtRange] = useState<DateRange | undefined>(() => {
    if (!initialFilters?.sentAtFrom && !initialFilters?.sentAtTo) return undefined;
    return {
      from: initialFilters?.sentAtFrom ? new Date(initialFilters.sentAtFrom) : undefined,
      to: initialFilters?.sentAtTo ? new Date(initialFilters.sentAtTo) : undefined,
    };
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Fires onFiltersChange immediately with current state + overrides.
   */
  const fireImmediately = useCallback(
    (overrides: Partial<Parameters<typeof collectFilters>[0]> = {}) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      onFiltersChange?.(
        collectFilters({
          status,
          notificationType,
          adapterUsed,
          userId,
          bodyTemplate,
          subjectTemplate,
          contextName,
          createdAtRange,
          sentAtRange,
          ...overrides,
        }),
      );
    },
    [status, notificationType, adapterUsed, userId, bodyTemplate, subjectTemplate, contextName, createdAtRange, sentAtRange, onFiltersChange],
  );

  /**
   * Debounced handler for text inputs.
   */
  const debouncedFire = useCallback(
    (overrides: Partial<Parameters<typeof collectFilters>[0]>) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onFiltersChange?.(
          collectFilters({
            status,
            notificationType,
            adapterUsed,
            userId,
            bodyTemplate,
            subjectTemplate,
            contextName,
            createdAtRange,
            sentAtRange,
            ...overrides,
          }),
        );
      }, 300);
    },
    [status, notificationType, adapterUsed, userId, bodyTemplate, subjectTemplate, contextName, createdAtRange, sentAtRange, onFiltersChange],
  );

  const handleTextChange = (setter: (v: string) => void, key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    debouncedFire({ [key]: e.target.value });
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return 'Pick a date range';
    if (!range.to) return format(range.from, 'LLL dd, y');
    return `${format(range.from, 'LLL dd, y')} – ${format(range.to, 'LLL dd, y')}`;
  };

  return (
    <div className="flex flex-col gap-4 p-4 border border-input rounded-lg bg-background">
      {/* Row 1: Status, Type, Adapter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-2">
        <div className="w-full sm:w-auto">
          <label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground mb-2 block">
            Status
          </label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              fireImmediately({ status: value });
            }}
            disabled={isLoading}
          >
            <SelectTrigger id="status-filter" data-testid="status-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {NOTIFICATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <label htmlFor="type-filter" className="text-sm font-medium text-muted-foreground mb-2 block">
            Type
          </label>
          <Select
            value={notificationType}
            onValueChange={(value) => {
              setNotificationType(value);
              fireImmediately({ notificationType: value });
            }}
            disabled={isLoading}
          >
            <SelectTrigger id="type-filter" data-testid="type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {NOTIFICATION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-0">
          <label htmlFor="adapter-filter" className="text-sm font-medium text-muted-foreground mb-2 block">
            Adapter Used
          </label>
          <Input
            id="adapter-filter"
            placeholder="e.g. sendgrid"
            value={adapterUsed}
            onChange={handleTextChange(setAdapterUsed, 'adapterUsed')}
            disabled={isLoading}
          />
        </div>

        <div className="flex-1 min-w-0">
          <label htmlFor="user-filter" className="text-sm font-medium text-muted-foreground mb-2 block">
            Recipient ID
          </label>
          <Input
            id="user-filter"
            placeholder="Recipient ID"
            value={userId}
            onChange={handleTextChange(setUserId, 'userId')}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Row 2: Templates & Context */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-2">
        <div className="flex-1 min-w-0">
          <label htmlFor="body-template-filter" className="text-sm font-medium text-muted-foreground mb-2 block">
            Body Template
          </label>
          <Input
            id="body-template-filter"
            placeholder="Body template name"
            value={bodyTemplate}
            onChange={handleTextChange(setBodyTemplate, 'bodyTemplate')}
            disabled={isLoading}
          />
        </div>

        <div className="flex-1 min-w-0">
          <label htmlFor="subject-template-filter" className="text-sm font-medium text-muted-foreground mb-2 block">
            Subject Template
          </label>
          <Input
            id="subject-template-filter"
            placeholder="Subject template name"
            value={subjectTemplate}
            onChange={handleTextChange(setSubjectTemplate, 'subjectTemplate')}
            disabled={isLoading}
          />
        </div>

        <div className="flex-1 min-w-0">
          <label htmlFor="context-filter" className="text-sm font-medium text-muted-foreground mb-2 block">
            Context
          </label>
          <Input
            id="context-filter"
            placeholder="Context"
            value={contextName}
            onChange={handleTextChange(setContextName, 'contextName')}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Row 3: Date Ranges */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-2">
        <div className="w-full sm:w-auto">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Created At
          </label>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start px-2.5 font-normal w-full sm:w-auto"
                  disabled={isLoading}
                >
                  <CalendarIcon className="size-4" />
                  <span className="truncate">{formatDateRange(createdAtRange)}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={createdAtRange?.from}
                  selected={createdAtRange}
                  onSelect={(range) => {
                    setCreatedAtRange(range);
                    fireImmediately({ createdAtRange: range });
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {createdAtRange && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setCreatedAtRange(undefined);
                  fireImmediately({ createdAtRange: undefined });
                }}
                disabled={isLoading}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Sent At
          </label>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start px-2.5 font-normal w-full sm:w-auto"
                  disabled={isLoading}
                >
                  <CalendarIcon className="size-4" />
                  <span className="truncate">{formatDateRange(sentAtRange)}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={sentAtRange?.from}
                  selected={sentAtRange}
                  onSelect={(range) => {
                    setSentAtRange(range);
                    fireImmediately({ sentAtRange: range });
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {sentAtRange && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setSentAtRange(undefined);
                  fireImmediately({ sentAtRange: undefined });
                }}
                disabled={isLoading}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
