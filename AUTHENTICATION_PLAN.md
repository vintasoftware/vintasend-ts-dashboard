# Authentication Implementation Plan — Strategy Pattern

## Overview

Implement pluggable authentication for the vintasend-dashboard using the **Strategy design pattern**. The hosting party chooses an auth provider (Clerk or Auth0) via environment variables, and the app delegates all auth operations to the selected strategy at runtime.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Dashboard App                  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │          AuthStrategy (interface)         │  │
│  │  ─────────────────────────────────────    │  │
│  │  getProvider()           → Provider JSX   │  │
│  │  getMiddleware()         → NextMiddleware  │  │
│  │  getCurrentUser()        → User | null    │  │
│  │  getSignInUrl()          → string         │  │
│  │  getSignOutUrl()         → string         │  │
│  │  isAuthenticated()       → boolean        │  │
│  │  getAuthHeaderValue()    → string | null  │  │
│  └────────┬────────────────────┬─────────────┘  │
│           │                    │                 │
│  ┌────────▼──────┐   ┌────────▼──────┐          │
│  │ ClerkStrategy │   │ Auth0Strategy │          │
│  └───────────────┘   └───────────────┘          │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │     resolveAuthStrategy(env) → Strategy   │  │
│  │     (factory / resolver)                  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

The strategy is resolved once via `AUTH_PROVIDER` env var (`"clerk"` | `"auth0"`) and injected into the app through a React context and Next.js middleware.

---

## Phase 1 — Define the Auth Strategy Interface & Factory

**Goal:** Establish the contract every auth provider must fulfill and create the factory that resolves the correct strategy from env vars.

### Tasks

1. Create `lib/auth/types.ts` — define the `AuthStrategy` interface:
   - `getProviderComponent(): React.ComponentType<{ children: React.ReactNode }>` — wraps the app with the provider's session context.
   - `getCurrentUser(request?: NextRequest): Promise<AuthUser | null>` — returns the current user.
   - `isAuthenticated(request?: NextRequest): Promise<boolean>` — checks if a user is logged in.
   - `getSignInUrl(): string` — returns the sign-in redirect URL.
   - `getSignOutUrl(): string` — returns the sign-out redirect URL.
   - `protectRoute(request: NextRequest): Promise<NextResponse | null>` — returns a redirect response if unauthenticated, or `null` to allow passage.
   - Define the `AuthUser` type: `{ id: string; email: string | null; name: string | null; imageUrl: string | null }`.

2. Create `lib/auth/resolve-strategy.ts` — factory function:
   - Reads `process.env.AUTH_PROVIDER`.
   - Returns the matching strategy instance.
   - Throws a descriptive error if the value is missing or unsupported.

3. Create `lib/auth/index.ts` — public barrel export.

### Testable Acceptance Criteria

- [ ] `AuthStrategy` interface compiles and is importable.
- [ ] `AuthUser` type compiles and is importable.
- [ ] `resolveAuthStrategy("clerk")` returns a `ClerkStrategy` instance (stub for now).
- [ ] `resolveAuthStrategy("auth0")` returns an `Auth0Strategy` instance (stub for now).
- [ ] `resolveAuthStrategy(undefined)` throws `"AUTH_PROVIDER env var is required"`.
- [ ] `resolveAuthStrategy("unknown")` throws `"Unsupported auth provider: unknown"`.
- [ ] Unit tests pass for the factory function with mocked env.

---

## Phase 2 — Implement the Clerk Strategy

**Goal:** Implement the `AuthStrategy` interface using `@clerk/nextjs`.

### Tasks

1. Install `@clerk/nextjs`.
2. Create `lib/auth/strategies/clerk-strategy.ts` implementing all interface methods:
   - `getProviderComponent()` → returns `ClerkProvider`.
   - `getCurrentUser()` → uses `currentUser()` from `@clerk/nextjs/server`.
   - `isAuthenticated()` → uses `auth()` from `@clerk/nextjs/server`.
   - `getSignInUrl()` → returns `"/sign-in"` (Clerk's default).
   - `getSignOutUrl()` → returns `"/sign-out"`.
   - `protectRoute()` → uses `auth.protect()` / redirect logic.
3. Create `app/sign-in/[[...sign-in]]/page.tsx` — renders `<SignIn />`.
4. Create `app/sign-out/[[...sign-out]]/page.tsx` — renders `<SignOut />` (optional, Clerk handles this via its component).

### Required Environment Variables

```
AUTH_PROVIDER=clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

### Testable Acceptance Criteria

- [ ] With `AUTH_PROVIDER=clerk` and valid Clerk keys, the app boots without errors.
- [ ] `getCurrentUser()` returns an `AuthUser` when logged in.
- [ ] `getCurrentUser()` returns `null` when logged out.
- [ ] `isAuthenticated()` returns `true` / `false` correctly.
- [ ] `protectRoute()` redirects to `/sign-in` for unauthenticated requests.
- [ ] `protectRoute()` returns `null` for authenticated requests.
- [ ] The sign-in page renders the Clerk `<SignIn />` component.
- [ ] Unit tests for mapping Clerk's user object to `AuthUser`.

---

## Phase 3 — Implement the Auth0 Strategy

**Goal:** Implement the `AuthStrategy` interface using `@auth0/nextjs-auth0`.

### Tasks

1. Install `@auth0/nextjs-auth0`.
2. Create `lib/auth/strategies/auth0-strategy.ts` implementing all interface methods:
   - `getProviderComponent()` → returns `Auth0Provider`.
   - `getCurrentUser()` → uses `getSession()` from `@auth0/nextjs-auth0`.
   - `isAuthenticated()` → session check.
   - `getSignInUrl()` → returns `"/api/auth/login"`.
   - `getSignOutUrl()` → returns `"/api/auth/logout"`.
   - `protectRoute()` → session check + redirect.
3. Create `app/api/auth/[auth0]/route.ts` — Auth0's catch-all API route handler.

### Required Environment Variables

```
AUTH_PROVIDER=auth0
AUTH0_SECRET=...
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
```

### Testable Acceptance Criteria

- [ ] With `AUTH_PROVIDER=auth0` and valid Auth0 config, the app boots without errors.
- [ ] `getCurrentUser()` returns an `AuthUser` when logged in.
- [ ] `getCurrentUser()` returns `null` when logged out.
- [ ] `isAuthenticated()` returns `true` / `false` correctly.
- [ ] `protectRoute()` redirects to Auth0 login for unauthenticated requests.
- [ ] `protectRoute()` returns `null` for authenticated requests.
- [ ] The Auth0 API route handler responds on `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`.
- [ ] Unit tests for mapping Auth0's session object to `AuthUser`.

---

## Phase 4 — Integrate Auth into the App Shell (Middleware + Layout)

**Goal:** Wire the resolved strategy into the Next.js middleware and root layout so every route is protected and the auth provider context is available app-wide.

### Tasks

1. Create `middleware.ts` at the dashboard root:
   - Calls `resolveAuthStrategy()`.
   - Calls `strategy.protectRoute(request)`.
   - Defines a `config.matcher` that excludes public assets, sign-in routes, and API auth routes.

2. Update `app/layout.tsx`:
   - Calls `resolveAuthStrategy()`.
   - Wraps `{children}` with the strategy's provider component.

3. Create `lib/auth/auth-context.tsx` — a React context that exposes:
   - `user: AuthUser | null`
   - `isAuthenticated: boolean`
   - `signInUrl: string`
   - `signOutUrl: string`

4. Create `app/components/auth-status.tsx` — a small UI component that shows the current user's name/email and a sign-out link (useful for testing and as a permanent header element).

### Testable Acceptance Criteria

- [ ] Unauthenticated requests to `/` are redirected to the sign-in page.
- [ ] Authenticated requests to `/` render the page normally.
- [ ] The `AuthContext` provides the correct user data to child components.
- [ ] `<AuthStatus />` displays the user's name when logged in.
- [ ] `<AuthStatus />` displays a "Sign In" link when logged out.
- [ ] Switching `AUTH_PROVIDER` between `clerk` and `auth0` works without code changes — only env vars change.
- [ ] Integration test: middleware redirects when no session cookie is present.
- [ ] Integration test: middleware allows passage when a valid session cookie is present.

---

## Phase 5 — Configuration Validation & Error Handling

**Goal:** Provide clear, actionable error messages when the app is misconfigured.

### Tasks

1. Add a `validateConfig(): string[]` method to the `AuthStrategy` interface.
   - Clerk: checks for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
   - Auth0: checks for `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`.

2. Call `validateConfig()` at app startup (in middleware and layout) and throw a consolidated error listing all missing variables.

3. Create a `app/error.tsx` (Next.js error boundary) that renders a user-friendly configuration error page in development mode.

4. Add a `.env.example` file documenting all possible env vars and which are needed for each provider.

### Testable Acceptance Criteria

- [ ] Missing `AUTH_PROVIDER` → descriptive error message.
- [ ] `AUTH_PROVIDER=clerk` with missing Clerk keys → error listing the missing keys.
- [ ] `AUTH_PROVIDER=auth0` with missing Auth0 keys → error listing the missing keys.
- [ ] `.env.example` is present and documents all variables.
- [ ] Unit tests for `validateConfig()` on both strategies.

---

## Phase 6 — Documentation & Developer Experience

**Goal:** Make it easy for someone hosting the dashboard to configure auth.

### Tasks

1. Update `README.md` with:
   - An "Authentication" section explaining the strategy pattern.
   - Step-by-step setup instructions for Clerk.
   - Step-by-step setup instructions for Auth0.
   - A table of all env vars and which provider they belong to.

2. Add inline JSDoc comments to the `AuthStrategy` interface.

3. Create a `lib/auth/README.md` with architecture notes for contributors.

### Testable Acceptance Criteria

- [ ] README includes setup instructions for both providers.
- [ ] A new developer can set up Clerk auth by following the README alone.
- [ ] A new developer can set up Auth0 auth by following the README alone.
- [ ] All public types and functions have JSDoc comments.

---

## File Structure After All Phases

```
app/
├── layout.tsx                          (updated: wraps with auth provider)
├── page.tsx
├── error.tsx                           (Phase 5)
├── sign-in/[[...sign-in]]/page.tsx     (Phase 2 — Clerk)
├── api/auth/[auth0]/route.ts           (Phase 3 — Auth0)
├── components/
│   └── auth-status.tsx                 (Phase 4)
lib/
└── auth/
    ├── index.ts                        (Phase 1)
    ├── types.ts                        (Phase 1)
    ├── resolve-strategy.ts             (Phase 1)
    ├── auth-context.tsx                (Phase 4)
    ├── README.md                       (Phase 6)
    └── strategies/
        ├── clerk-strategy.ts           (Phase 2)
        └── auth0-strategy.ts           (Phase 3)
middleware.ts                           (Phase 4)
.env.example                           (Phase 5)
```

---

## Suggested Implementation Order

| Order | Phase | Depends On | Estimated Effort |
|-------|-------|------------|-----------------|
| 1     | Phase 1 — Interface & Factory | — | Small |
| 2     | Phase 2 — Clerk Strategy | Phase 1 | Medium |
| 3     | Phase 4 — App Integration | Phase 1 + Phase 2 | Medium |
| 4     | Phase 3 — Auth0 Strategy | Phase 1 + Phase 4 | Medium |
| 5     | Phase 5 — Config Validation | Phase 2 + Phase 3 | Small |
| 6     | Phase 6 — Documentation | All | Small |

> **Note:** Phase 4 is intentionally done before Phase 3 so you can validate the full auth flow end-to-end with Clerk first, then add Auth0 as a second provider into an already-working integration.
