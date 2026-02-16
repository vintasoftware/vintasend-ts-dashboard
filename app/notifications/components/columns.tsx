'use client';

import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import type { AnyDashboardNotification, DashboardNotification, DashboardOneOffNotification } from '@/lib/notifications/types';
import type { NotificationStatus } from 'vintasend/dist/types/notification-status';
import type { NotificationType } from 'vintasend/dist/types/notification-type';
/**
 * Maps notification status to badge variant colors.
 */
const statusVariantMap: Record<NotificationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING_SEND: 'default',
  SENT: 'secondary',
  FAILED: 'destructive',
  READ: 'outline',
  CANCELLED: 'secondary',
};

/**
 * Maps notification type to badge variant colors.
 */
const typeVariantMap: Record<NotificationType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  EMAIL: 'default',
  SMS: 'secondary',
  PUSH: 'outline',
  IN_APP: 'default',
};

/**
 * Formats a date string (ISO format) for display.
 * Returns empty string if date is null/undefined.
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return '—';
  }
}

/**
 * Determines if a notification is one-off or regular.
 */
function isOneOff(notification: AnyDashboardNotification): notification is DashboardOneOffNotification {
  return 'emailOrPhone' in notification;
}

/**
 * Gets the recipient identifier for display.
 */
function getRecipient(notification: AnyDashboardNotification): string {
  if (isOneOff(notification)) {
    return notification.emailOrPhone || '—';
  }
  // For regular notifications, access userId (DashboardNotification has userId field)
  const regularNotification = notification as DashboardNotification;
  return regularNotification.userId || '—';
}

/**
 * TanStack column definitions for the notifications table.
 */
export const columns: ColumnDef<AnyDashboardNotification>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.id}</span>,
    size: 120,
  },

  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => row.original.title || '—',
    size: 180,
  },

  {
    accessorKey: 'notificationType',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.notificationType;
      return <Badge variant={typeVariantMap[type]}>{type}</Badge>;
    },
    size: 100,
  },

  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return <Badge variant={statusVariantMap[status]}>{status}</Badge>;
    },
    size: 120,
  },

  {
    accessorKey: 'contextName',
    header: 'Context',
    cell: ({ row }) => row.original.contextName || '—',
    size: 150,
  },

  {
    accessorKey: 'recipient',
    header: 'Recipient',
    cell: ({ row }) => getRecipient(row.original),
    size: 180,
  },

  {
    accessorKey: 'sendAfter',
    header: 'Send After',
    cell: ({ row }) => formatDate(row.original.sendAfter),
    size: 160,
  },

  {
    accessorKey: 'sentAt',
    header: 'Sent At',
    cell: ({ row }) => formatDate(row.original.sentAt),
    size: 160,
  },

  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-8"
      >
        Created At
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => formatDate(row.original.createdAt),
    size: 160,
  },

  {
    accessorKey: 'adapterUsed',
    header: 'Adapter',
    cell: ({ row }) => row.original.adapterUsed || '—',
    size: 120,
  },

  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => console.log('View details:', row.original.id)}>
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Copy ID</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 80,
  },
];
