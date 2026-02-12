# Authentication Plan Tracking

## Phase 1 - Interface and Factory

- [x] Added AuthStrategy interface and AuthUser type.
- [x] Implemented resolveAuthStrategy factory with env validation.
- [x] Added auth barrel exports.
- [x] Added stub Clerk and Auth0 strategies for factory wiring.

## Phase 2 - Clerk Strategy

- [x] Installed @clerk/nextjs.
- [x] Implemented ClerkStrategy with Clerk provider, user mapping, auth checks, and redirect handling.
- [x] Added Clerk sign-in page.
- [x] Added Clerk sign-out page.

## Phase 3 - Auth0 Strategy

- [x] Installed @auth0/nextjs-auth0.
- [x] Implemented Auth0Strategy with Auth0 provider, user mapping, auth checks, and redirect handling.
- [x] Auth0 API route handler ready for dynamic configuration.

## Phase 4 - Integrate Auth into the App Shell (Middleware + Layout)

- [x] Created `middleware.ts` with route protection and public route exclusions.
- [x] Updated `app/layout.tsx` to:
  - Resolve auth strategy
  - Wrap app with provider component
  - Initialize AuthProvider with user data and URLs
- [x] Created `lib/auth/auth-context.tsx`:
  - React context providing user, isAuthenticated, isLoading, signInUrl, signOutUrl
  - useAuth hook for consuming context in client components
- [x] Created `app/components/auth-status.tsx`:
  - Shows user info when authenticated
  - Shows sign-in link when not authenticated
  - Displays loading state during user fetch
  - Includes sign-out link
- [x] Updated `app/page.tsx` to display AuthStatus component
- [x] Added auth-context exports to barrel file

## Phase 5 - Configuration Validation & Error Handling

- [x] Added `validateConfig()` to `AuthStrategy` and implemented it in Clerk/Auth0 strategies.
- [x] Validated auth config in middleware and layout with consolidated errors.
- [x] Added `app/error.tsx` for a friendly configuration error page in development.
- [x] Added `.env.example` documenting provider env vars.

## Phase 6 - Documentation & Developer Experience

- [x] Updated dashboard README with auth strategy overview and setup steps.
- [x] Added an env var table documenting provider configuration.
- [x] Added JSDoc to `AuthStrategy` and public auth exports.
- [x] Created `lib/auth/README.md` with architecture notes.
