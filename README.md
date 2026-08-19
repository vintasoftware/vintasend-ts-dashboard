# VintaSend Dashboard

Next.js dashboard for browsing, previewing, resending and cancelling
[VintaSend](https://github.com/vintasoftware/vintasend) and 
[VintaSend-TS](https://github.com/vintasoftware/vintasend-ts) notifications, with
pluggable authentication (Clerk or Auth0) selected via environment variables.

The dashboard is a **pure client of the
[VintaSend API](https://github.com/vintasoftware/vintasend-ts-api)**. It holds no
notification backend, no database credentials and no template rendering: it
reads and writes everything through the API's HTTP contract. Any implementation
of that contract can serve this UI — including one built on the Python
`vintasend` package.

```
┌─────────────────────┐   HTTPS + API key    ┌──────────────────┐
│  This dashboard     │ ───────────────────▶ │  vintasend-api   │
│  (Clerk / Auth0)    │ ◀─────────────────── │  + your backend  │
└─────────────────────┘     JSON contract    └──────────────────┘
```

Calls to the API are made **from the dashboard's server only** (server
components and server actions), so `VINTASEND_API_KEY` never reaches a browser.

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.example .env.local
```

3. Point the dashboard at a running VintaSend API:

```bash
VINTASEND_API_URL=http://localhost:3333
VINTASEND_API_KEY=the-same-key-the-api-was-started-with
```

If you do not have an API running yet, follow the setup in
[vintasend-ts-api](https://github.com/vintasoftware/vintasend-ts-api) or 
[vintasend-api](https://github.com/vintasoftware/vintasend-api) — that is
where you configure which VintaSend backend, adapters and template renderer to
use, along with the GitHub credentials used for template previews.

4. Configure authentication (see below), then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

| Path | Responsibility |
| --- | --- |
| `lib/api/types.ts` | The API's wire contract, mirroring `openapi.yaml` in the API repo. |
| `lib/api/client.ts` | Server-only HTTP client: base URL, bearer key, error envelope. |
| `lib/api/notifications.ts` | Typed wrappers for each endpoint. |
| `lib/notifications/types.ts` | UI filter state, plus a single import point for contract types. |
| `app/actions.ts` | Server actions the client components call. |
| `app/components/` | The notifications page: table, filters, detail panel, dialogs. |

Notifications arrive with a `kind` discriminator (`user` or `one-off`), so
components branch on that rather than sniffing for fields. Errors from the API
carry a machine-readable `code`; the preview dialog, for example, distinguishes
`PREVIEW_UNAVAILABLE` from a genuine failure.

## Authentication

The dashboard uses a strategy pattern: `resolveAuthStrategy()` reads
`AUTH_PROVIDER` and delegates auth operations to the chosen provider. The
proxy middleware (`proxy.ts`) protects routes and handles provider-specific
auth flows, while the app layout wraps the UI with the provider component.

### Architecture

- **Clerk**: Uses `clerkMiddleware()` and renders Clerk components
- **Auth0 v4**: Uses `auth0.middleware()` which auto-mounts routes at `/auth/*`
  (no API route handlers needed)

### Clerk setup

1. Create a Clerk application and copy the publishable/secret keys.
2. Set `AUTH_PROVIDER=clerk` in `.env.local`.
3. Add the Clerk keys listed below.
4. Start the dev server and visit `/sign-in`.

### Auth0 setup

1. Create an Auth0 Regular Web Application.
2. Configure application URLs:
	- Allowed Callback URLs: `http://localhost:3000/auth/callback`
	- Allowed Logout URLs: `http://localhost:3000`
	- Allowed Web Origins: `http://localhost:3000`
3. Set `AUTH_PROVIDER=auth0` in `.env.local`.
4. Add the Auth0 values listed below.
5. Start the dev server and visit `/auth/login`.

**Note:** This dashboard uses Auth0 SDK v4, which no longer uses the `/api` prefix for auth routes. The routes are now mounted automatically by the middleware at `/auth/*`.

## Environment variables

| Variable | Provider | Description |
| --- | --- | --- |
| VINTASEND_API_URL | API | Base URL of the VintaSend API (e.g. `http://localhost:3333`). |
| VINTASEND_API_KEY | API | Shared secret sent as a bearer token. Server-side only. |
| AUTH_PROVIDER | Clerk, Auth0 | Selects which auth strategy to use (`clerk` or `auth0`). |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk | Clerk publishable key. |
| CLERK_SECRET_KEY | Clerk | Clerk secret key. |
| AUTH0_SECRET | Auth0 | Session cookie encryption secret. |
| APP_BASE_URL | Auth0 | Base URL of the app (e.g. `http://localhost:3000`). **Note:** In Auth0 v4, this was renamed from `AUTH0_BASE_URL`. |
| AUTH0_DOMAIN | Auth0 | Auth0 tenant domain without scheme (e.g. `example.us.auth0.com`). **Note:** In Auth0 v4, this was renamed from `AUTH0_ISSUER_BASE_URL` and no longer accepts `https://`. |
| AUTH0_CLIENT_ID | Auth0 | Auth0 application client ID. |
| AUTH0_CLIENT_SECRET | Auth0 | Auth0 application client secret. |

Backend credentials (database, mail provider, GitHub token for template
previews) now belong to the API, not to this app.

## Development

```bash
npm run dev        # dev server
npm test           # jest
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
