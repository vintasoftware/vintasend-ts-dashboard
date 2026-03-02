import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the notifications page.
 * Shown while the page is streaming/hydrating via Suspense.
 */
export function NotificationsLoadingFallback() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-80" />
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col gap-4 p-4 border border-input rounded-lg bg-background sm:flex-row sm:items-end sm:gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="w-full sm:w-auto space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="w-full sm:w-auto space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-8" />
                </th>
                <th className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-12" />
                </th>
                <th className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={`skeleton-row-${// biome-ignore lint/suspicious/noArrayIndexKey: This is a static skeleton list, not dynamic data
                  i
                }`} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-8" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between gap-4 mt-6">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default NotificationsLoadingFallback;
