import { Suspense } from 'react';

import { NotificationsPageClient } from './components/notifications-page-client';
import { NotificationsLoadingFallback } from './loading';

/**
 * Notifications page.
 *
 * There is nothing to fetch here any more. Filters, pagination and the list
 * query all live in `vintasend-dashboard-core`'s hooks, which read the query
 * string directly, so the page is only a Suspense boundary around the client
 * component. Next requires that boundary of anything calling `useSearchParams`
 * — which the core's Next router adapter does — and without it the whole route
 * opts out of static rendering.
 */
export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsLoadingFallback />}>
      <NotificationsPageClient />
    </Suspense>
  );
}
