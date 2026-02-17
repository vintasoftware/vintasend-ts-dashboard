'use client';
'use no memo';

import type { Cell, Row, SortingState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AnyDashboardNotification } from '@/lib/notifications/types';
import { createColumns, columns as defaultColumns } from './columns';


type SkeletonRow = {
  id: string;
  original: null;
  isSkeleton: true;
};

type DataRow = Row<AnyDashboardNotification> & {
    id: string;
    original: AnyDashboardNotification;
    isSkeleton: false;
};

interface NotificationsTableProps {
  data: AnyDashboardNotification[];
  hasMore: boolean;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  onPaginationChange?: (page: number) => void;
  /**
   * Callback fired when a row is clicked.
   * @param id - Notification ID
   */
  onRowClick?: (id: string) => void;
}

/**
 * Renders a paginated, filterable notifications table.
 * Uses TanStack Table for headless table logic and shadcn/ui for components.
 *
 * @param data - Array of notifications to display
 * @param hasMore - Whether there are more pages after the current one
 * @param currentPage - Current page (1-indexed)
 * @param pageSize - Items per page
 * @param isLoading - Whether data is loading
 * @param onPaginationChange - Callback when page changes
 * @param onRowClick - Callback when a row is clicked
 */
export function NotificationsTable({
  data,
  hasMore,
  currentPage,
  pageSize,
  isLoading = false,
  onPaginationChange,
  onRowClick,
}: NotificationsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // Create columns with action callbacks
  const columns = onRowClick ? createColumns({ onViewDetails: onRowClick }) : defaultColumns;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  const rows = table.getRowModel().rows;

  // Show skeleton rows while loading
  const displayRows = isLoading
    ? Array.from({ length: pageSize }).map((_, i): SkeletonRow => ({
        id: `skeleton-${i}`,
        original: null,
        isSkeleton: true,
      }))
    : rows.map((row): DataRow => ({
        ...row,
        id: row.id,
        original: row.original,
        isSkeleton: false,
      }));

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="py-3 px-4">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 && !isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No notifications found.
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row) => (
                <TableRow
                  key={row.id}
                  data-testid={`notification-row-${row.id}`}
                  className={onRowClick && !row.isSkeleton ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => {
                    if (onRowClick && !row.isSkeleton) {
                      onRowClick(row.original.id);
                    }
                  }}
                >
                  {row.isSkeleton ? (
                    // Skeleton row
                    Array.from({ length: columns.length }).map((_, i) => (
                      <TableCell key={`${row.id}-skeleton-${i}`} className="py-3 px-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))
                  ) : (
                    // Normal row
                    row.getVisibleCells().map((cell: Cell<AnyDashboardNotification, unknown>) => (
                      <TableCell key={cell.id} className="py-3 px-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {(currentPage > 1 || hasMore) && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Page {currentPage}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginationChange?.(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginationChange?.(currentPage + 1)}
              disabled={!hasMore || isLoading}
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
