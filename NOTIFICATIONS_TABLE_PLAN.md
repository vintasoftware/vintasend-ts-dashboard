# Notifications Table Feature — Development Plan

## Goal

Build an authenticated, SSR-powered notifications page inside the VintaSend
Dashboard. The page displays a dynamic, filterable, paginated table of
notifications sourced from the VintaSend `notification-service` API. It must be
accessible **only to authenticated users** (Clerk or Auth0) and must never
trigger a full page reload on user interaction (filters, pagination, sorting);
only the data should reload.

---

## Tech Stack & Key Libraries

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, RSC + Client Components) |
| Table | **TanStack Table** (`@tanstack/react-table`) |
| UI Components | **shadcn/ui** (Table, Badge, Select, Input, Button, Skeleton, Pagination, DropdownMenu, Popover, DatePicker) |
| Data Fetching | Next.js Server Actions + `useTransition` / `startTransition` for non-blocking reloads |
| Auth | Existing `AuthStrategy` + middleware (`proxy.ts`) |
| Styling | Tailwind CSS (already configured) |
| Testing | Jest + React Testing Library, with msw for API mocking |

---

## Data Model Summary

From `notification-service.ts` and the type files, the key fields to display:

| Field | Type | Notes |
|---|---|---|
| `id` | `Identifier` | Primary key |
| `notificationType` | `'PUSH' \| 'EMAIL' \| 'SMS' \| 'IN_APP'` | Filter target |
| `status` | `'PENDING_SEND' \| 'SENT' \| 'FAILED' \| 'READ' \| 'CANCELLED'` | Filter target |
| `title` | `string \| null` | Searchable |
| `contextName` | `string` | Display |
| `sendAfter` | `Date \| null` | Date range filter |
| `sentAt` | `Date \| null` | Display |
| `readAt` | `Date \| null` | Display |
| `createdAt` | `Date \| undefined` | Sortable |
| `userId` | `Identifier` | Filter (regular notifications) |
| `emailOrPhone` | `string` | Filter (one-off notifications) |
| `adapterUsed` | `string \| null` | Display |
| `bodyTemplate` | `string` | Hidden by default, expandable |

The backend exposes paginated queries:

```ts
getNotifications(page: number, pageSize: number)
getPendingNotifications(page: number, pageSize: number)
getFutureNotifications(page: number, pageSize: number)
getOneOffNotifications(page: number, pageSize: number)
```

---

## Architecture Decisions

### SSR + Client Interactivity (No Full Page Refresh)

The approach uses **Server Actions** combined with **`useTransition`** so the
page is server-rendered on first load (good SEO, fast TTI) but all subsequent
data reloads happen without page navigation:

1. **Server Action** `fetchNotifications(filters, page, pageSize)` runs on
   the server, calls the VintaSend backend, and returns serialised data.
2. A **Client Component** wraps the table, owns filter/pagination state, and
   calls the server action via `startTransition` whenever state changes.
3. URL search params are synced via `useSearchParams` + `router.replace`
   (shallow) so the current view is shareable/bookmarkable.

### Authentication

The existing `proxy.ts` middleware already protects all routes except
`/sign-in`, `/sign-out`, `/auth`, `/_next`, and `/public`. A new
`/notifications` route is automatically protected. No additional auth
work is needed beyond verifying it in tests.

---

## Development Phases

### Phase 1 — Project Setup & shadcn/ui + TanStack Table Installation

**Goal:** Install all dependencies, initialise shadcn/ui, and confirm
everything compiles.

#### Tasks

1. Install TanStack Table:
   ```bash
   npm install @tanstack/react-table
   ```
2. Initialise shadcn/ui (`npx shadcn@latest init`) and add required
   components:
   ```bash
   npx shadcn@latest add table badge select input button skeleton
   npx shadcn@latest add dropdown-menu popover calendar pagination
   ```
3. Install date-fns (used by shadcn DatePicker and for date formatting):
   ```bash
   npm install date-fns
   ```
4. Verify the dev server starts without errors.

#### Tests

| # | Test | Type |
|---|---|---|
| 1.1 | Smoke test: `npm run build` succeeds after install | Build |
| 1.2 | Smoke test: shadcn `<Button>` renders in a test file | Unit (RTL) |

#### Deliverables

- Updated `package.json` with new dependencies.
- `components/ui/` folder populated by shadcn CLI.
- A minimal `__tests__/setup-smoke.test.tsx` confirming the component renders.

---

### Phase 2 — Notification Types & Server Action Skeleton

**Goal:** Define dashboard-specific notification types (serialisable DTOs),
create the server action that fetches notifications, and ensure it is callable
from a client component.

#### Tasks

1. Create `lib/notifications/types.ts`:
   - `DashboardNotification` — a plain JSON-safe DTO mirroring
     `DatabaseNotification` with dates as ISO strings.
   - `DashboardOneOffNotification` — DTO for one-off notifications.
   - `NotificationFilters` — `{ status?, notificationType?, search? }`.
   - `PaginatedResult<T>` — `{ data: T[]; page: number; pageSize: number; total: number }`.

2. Create `lib/notifications/serialize.ts`:
   - `serializeNotification(n)` — converts `DatabaseNotification` /
     `DatabaseOneOffNotification` → `DashboardNotification` /
     `DashboardOneOffNotification` (dates → ISO strings, strip large
     context payloads for listing).

3. Create `app/notifications/actions.ts` (Server Action):
   ```ts
   "use server";
   export async function fetchNotifications(
     filters: NotificationFilters,
     page: number,
     pageSize: number,
   ): Promise<PaginatedResult<DashboardNotification>> { … }
   ```
   - For now, return mock data so client work can proceed in parallel.

4. Create `lib/notifications/get-vintasend-service.ts`:
   - Factory helper that instantiates the VintaSend service with the
     application's backend and adapters. Called only inside server actions.
   - This will be filled in Phase 5 with the real backend; initially returns
     mocks.

#### Tests

| # | Test | Type |
|---|---|---|
| 2.1 | `serializeNotification` converts `Date` fields to ISO strings | Unit |
| 2.2 | `serializeNotification` strips `contextUsed` to keep payload small | Unit |
| 2.3 | `fetchNotifications` returns `PaginatedResult` shape (mock) | Unit |
| 2.4 | `NotificationFilters` type-checks expected filter combos | Type (tsc) |

#### Deliverables

- `lib/notifications/types.ts`
- `lib/notifications/serialize.ts`
- `app/notifications/actions.ts`
- `lib/notifications/get-vintasend-service.ts`
- `__tests__/notifications/serialize.test.ts`
- `__tests__/notifications/actions.test.ts`

---

### Phase 3 — Notifications Table Component (Static, Client-Side)

**Goal:** Build the `<NotificationsTable>` client component using TanStack
Table + shadcn/ui. Wire it to mock data first so the UI can be developed
and tested independently.

#### Tasks

1. Create `app/notifications/components/columns.tsx`:
   - Define TanStack `ColumnDef<DashboardNotification>[]` with columns:
     `id`, `title`, `notificationType` (Badge), `status` (coloured Badge),
     `contextName`, `sendAfter`, `sentAt`, `createdAt`, actions dropdown.
   - Use shadcn `<Badge>` with variant mapped to status.
   - Use `date-fns` `format()` for date columns.
   - Enable sorting metadata on `createdAt` and `sentAt`.

2. Create `app/notifications/components/notifications-table.tsx`:
   - Client component (`"use client"`).
   - Accepts `data: DashboardNotification[]`, `pageCount`, `page`,
     `pageSize`, `onPaginationChange`, `onFiltersChange`, `isLoading`.
   - Sets up `useReactTable` with:
     - `manualPagination: true`
     - `manualFiltering: true`
     - `manualSorting: true`
   - Renders shadcn `<Table>`, `<TableHeader>`, `<TableBody>`, etc.
   - Shows `<Skeleton>` rows when `isLoading`.
   - Pagination controls at the bottom using shadcn `<Button>`s
     (First / Prev / Next / Last + page indicator).

3. Create `app/notifications/components/notifications-filters.tsx`:
   - Client component with:
     - shadcn `<Select>` for `notificationType` filter (All / EMAIL / SMS /
       PUSH / IN_APP).
     - shadcn `<Select>` for `status` filter (All / PENDING_SEND / SENT /
       FAILED / READ / CANCELLED).
     - shadcn `<Input>` for free-text search (title / id / emailOrPhone).
     - Debounced `onChange` (300ms) that calls `onFiltersChange`.
   - Renders filters inline in a responsive flex row.

#### Tests

| # | Test | Type |
|---|---|---|
| 3.1 | `<NotificationsTable>` renders rows matching mock data count | Unit (RTL) |
| 3.2 | Status badges display correct variant per status | Unit (RTL) |
| 3.3 | Clicking "Next" fires `onPaginationChange` with `page + 1` | Unit (RTL) |
| 3.4 | Changing status select fires `onFiltersChange` with `{ status: 'SENT' }` | Unit (RTL) |
| 3.5 | Skeleton rows shown when `isLoading={true}` | Unit (RTL) |
| 3.6 | Search input debounces and fires callback after 300ms | Unit (RTL) |

#### Deliverables

- `app/notifications/components/columns.tsx`
- `app/notifications/components/notifications-table.tsx`
- `app/notifications/components/notifications-filters.tsx`
- `__tests__/notifications/components/notifications-table.test.tsx`
- `__tests__/notifications/components/notifications-filters.test.tsx`

---

### Phase 4 — Notifications Page (SSR + Client Interactivity)

**Goal:** Create the `/notifications` page that server-renders the initial
data and delegates all subsequent interaction to client-side state that
calls the server action without page reloads.

#### Tasks

1. Create `app/notifications/page.tsx` (Server Component):
   - Reads initial `searchParams` (page, pageSize, status, type, search).
   - Calls `fetchNotifications(…)` server-side for initial data.
   - Renders `<NotificationsPageClient initialData={…} initialFilters={…} />`.

2. Create `app/notifications/components/notifications-page-client.tsx`:
   - Client component (`"use client"`).
   - Owns state: `filters`, `page`, `pageSize`, `data`, `isLoading`.
   - Uses `useTransition` + `startTransition` to call the
     `fetchNotifications` server action on filter/page changes.
   - Syncs state to URL search params via `useSearchParams` +
     `router.replace(url, { scroll: false })` for bookmarkable state —
     **no page reload**.
   - Composes `<NotificationsFilters>` and `<NotificationsTable>`.
   - `isPending` from `useTransition` drives `isLoading` prop.

3. Create `app/notifications/loading.tsx`:
   - Shows a skeleton table while the page streams (suspense boundary).

4. Create `app/notifications/error.tsx`:
   - Shows a user-friendly error with a "Retry" button.

#### Tests

| # | Test | Type |
|---|---|---|
| 4.1 | `/notifications` page renders table with initial data (SSR snapshot) | Integration (RTL) |
| 4.2 | Changing a filter updates URL search params without full navigation | Integration (RTL) |
| 4.3 | `isPending` shows loading skeleton while server action resolves | Integration (RTL) |
| 4.4 | Error boundary renders error UI when server action throws | Integration (RTL) |
| 4.5 | Unauthenticated request to `/notifications` redirects to sign-in (middleware test) | Integration |

#### Deliverables

- `app/notifications/page.tsx`
- `app/notifications/components/notifications-page-client.tsx`
- `app/notifications/loading.tsx`
- `app/notifications/error.tsx`
- `__tests__/notifications/page.test.tsx`
- `__tests__/notifications/middleware-auth.test.ts`

---

### Phase 5 — Real Backend Integration

**Goal:** Replace mock data with real VintaSend service calls. Wire the
server action to the actual notification backend configured in the host
application.

#### Tasks

1. Implement `lib/notifications/get-vintasend-service.ts`:
   - Expose a `getVintaSendService()` function that reads environment
     config and returns a configured `VintaSend` instance.
   - For the dashboard, the service needs **read-only** operations:
     `getNotifications`, `getPendingNotifications`,
     `getFutureNotifications`, `getNotification`,
     `getOneOffNotifications`.
   - The backend dependency should be injectable so the dashboard works
     with any backend implementation (Prisma, etc.).

2. Update `app/notifications/actions.ts`:
   - Replace mock data with calls to `getVintaSendService()`.
   - Implement filter logic: if `status === 'PENDING_SEND'` use
     `getPendingNotifications`, if filtering future use
     `getFutureNotifications`, otherwise use `getNotifications`.
   - Apply free-text search (title contains) post-fetch or via backend.
   - Serialize results with `serializeNotification`.

3. Handle edge cases:
   - Backend unavailable → throw with user-friendly error message.
   - Empty results → show empty state ("No notifications found").

#### Tests

| # | Test | Type |
|---|---|---|
| 5.1 | Server action returns real-shaped data from mock backend | Integration |
| 5.2 | `status` filter correctly delegates to `getPendingNotifications` | Unit |
| 5.3 | Service creation fails gracefully when env vars missing | Unit |
| 5.4 | Empty result set returns `{ data: [], total: 0 }` | Unit |
| 5.5 | Date serialization round-trips correctly through action | Unit |

#### Deliverables

- Updated `lib/notifications/get-vintasend-service.ts`
- Updated `app/notifications/actions.ts`
- `__tests__/notifications/backend-integration.test.ts`

---

### Phase 6 — Notification Detail View (Expandable Row / Side Panel)

**Goal:** Allow users to click a notification row to see full details
(body template, context used, extra params, attachments) without leaving
the page.

#### Tasks

1. Create `app/notifications/components/notification-detail.tsx`:
   - Client component shown as an expandable row or a side sheet
     (shadcn `Sheet` or `Dialog`).
   - Calls a new server action `fetchNotificationDetail(id)` to load
     full notification data (including `contextUsed`, `bodyTemplate`,
     `extraParams`, `attachments`).
   - Displays fields in a structured layout using shadcn
     `Card`/`Separator`.

2. Add a `getNotificationDetail` server action in
   `app/notifications/actions.ts`:
   ```ts
   export async function fetchNotificationDetail(
     id: string,
   ): Promise<DashboardNotificationDetail> { … }
   ```

3. Wire the actions column (or row click) in the table to open the
   detail view.

#### Tests

| # | Test | Type |
|---|---|---|
| 6.1 | Clicking a row opens the detail panel | Unit (RTL) |
| 6.2 | Detail panel displays `bodyTemplate` and `contextUsed` | Unit (RTL) |
| 6.3 | Detail panel shows attachments list when present | Unit (RTL) |
| 6.4 | Closing the panel does not trigger a page reload | Unit (RTL) |

#### Deliverables

- `app/notifications/components/notification-detail.tsx`
- Updated `app/notifications/actions.ts`
- `__tests__/notifications/components/notification-detail.test.tsx`

---

### Phase 7 — Polish, Accessibility & E2E Tests

**Goal:** Final polish pass — empty states, responsive design,
keyboard navigation, ARIA attributes, and integration-level tests.

#### Tasks

1. Add an empty-state component when no notifications match filters.
2. Ensure all interactive elements have proper ARIA labels.
3. Add keyboard navigation support for the table (Tab, Enter to open
   detail, Escape to close).
4. Responsive adjustments (hide less-important columns on mobile via
   TanStack Table `columnVisibility`).
5. Add column visibility toggle dropdown using shadcn `<DropdownMenu>`.

#### Tests

| # | Test | Type |
|---|---|---|
| 7.1 | Empty state shown when `data.length === 0` | Unit (RTL) |
| 7.2 | Table columns collapse on narrow viewport | Unit (RTL) |
| 7.3 | Column visibility toggle hides/shows columns | Unit (RTL) |
| 7.4 | Full flow: load → filter → paginate → view detail → close | Integration |
| 7.5 | Keyboard: Tab reaches pagination, Enter activates | Integration |

#### Deliverables

- `app/notifications/components/empty-state.tsx`
- `app/notifications/components/column-visibility-toggle.tsx`
- Updated components with ARIA/responsive fixes.

---

## File Structure (Final)

```
app/
  notifications/
    page.tsx                          # SSR entry point
    loading.tsx                       # Suspense skeleton
    error.tsx                         # Error boundary
    actions.ts                        # Server actions
    components/
      columns.tsx                     # TanStack column definitions
      notifications-table.tsx         # Table client component
      notifications-filters.tsx       # Filter bar
      notifications-page-client.tsx   # Client wrapper (state + transitions)
      notification-detail.tsx         # Detail panel / sheet
      empty-state.tsx                 # Empty results
      column-visibility-toggle.tsx    # Column show/hide dropdown
components/
  ui/                                 # shadcn/ui generated components
    badge.tsx
    button.tsx
    calendar.tsx
    dropdown-menu.tsx
    input.tsx
    pagination.tsx
    popover.tsx
    select.tsx
    skeleton.tsx
    table.tsx
    sheet.tsx
    card.tsx
    separator.tsx
lib/
  notifications/
    types.ts                          # Dashboard DTOs & filter types
    serialize.ts                      # DB entity → DTO conversion
    get-vintasend-service.ts          # Service factory for server actions
__tests__/
  notifications/
    serialize.test.ts
    actions.test.ts
    backend-integration.test.ts
    middleware-auth.test.ts
    page.test.tsx
    e2e-flow.test.tsx
    components/
      notifications-table.test.tsx
      notifications-filters.test.tsx
      notification-detail.test.tsx
```

---

## Key Patterns

### No-Reload Data Fetching

```tsx
// notifications-page-client.tsx (simplified)
"use client";

import { useTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchNotifications } from "../actions";

export function NotificationsPageClient({ initialData, initialFilters }) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleFiltersChange(newFilters) {
    // Update URL (no reload — shallow replace)
    const params = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([k, v]) =>
      v ? params.set(k, v) : params.delete(k)
    );
    router.replace(`?${params.toString()}`, { scroll: false });

    // Fetch new data without blocking UI
    startTransition(async () => {
      const result = await fetchNotifications(newFilters, 1, data.pageSize);
      setData(result);
    });
  }

  return (
    <>
      <NotificationsFilters onFiltersChange={handleFiltersChange} />
      <NotificationsTable data={data} isLoading={isPending} ... />
    </>
  );
}
```

### Auth Protection

Handled automatically by `proxy.ts` middleware — `/notifications` does
not match any public route pattern, so unauthenticated requests redirect
to the sign-in page. The server action also runs in an authenticated
context, so auth is verified on both the page render and every data
fetch.

---

## Dependency Summary

| Package | Purpose | Phase |
|---|---|---|
| `@tanstack/react-table` | Headless table logic | 1 |
| `shadcn/ui` components | Pre-built accessible UI primitives | 1 |
| `date-fns` | Date formatting & manipulation | 1 |
| `@testing-library/react` | Component testing | 1 (if not already) |
| `msw` | API / server action mocking in tests | 2 |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| TanStack Table SSR hydration mismatch | Keep table as client component; SSR only the data via server action |
| Large notification payloads | Strip `contextUsed` from list DTOs; load full data only in detail view |
| Backend pagination doesn't support total count | Add `total` to backend response or estimate from page fullness |
| Filter combinations not supported by backend | Apply unsupported filters post-fetch in the server action |
| shadcn/ui version mismatch with React 19 | Pin compatible versions; test early in Phase 1 |
