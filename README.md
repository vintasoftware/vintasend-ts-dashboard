# VintaSend Dashboard

This dashboard is a Next.js app with pluggable authentication (Clerk or Auth0)
selected via environment variables.

## After cloning

1. Go to the dashboard folder:

```bash
cd src/tools/vintasend-dashboard
```

2. Install dependencies:

```bash
npm install
```

3. Create your local environment file from the example:

```bash
cp .env.example .env.local
```

4. Configure auth and backend variables in `.env.local`.
5. Configure your VintaSend service in `lib/notifications/get-vintasend-service.ts` (see section below).
6. Remove the `lib/notifications/get-vintasend-service.ts` from the `.gitignore` file.
7. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configure your VintaSend service

The dashboard uses `lib/notifications/get-vintasend-service.ts` as the backend
factory for all notification actions. You must adapt this file to your own
VintaSend implementation.

Minimum setup:

1. Open `lib/notifications/get-vintasend-service.ts`.
2. Replace imports from the Medplum example with imports from your service
	package/module.
3. Build and return your configured VintaSend service in
	`getVintaSendService()`.
4. Update `validateBackendConfig()` so it checks only the environment
	variables required by your backend.
5. Ensure all required backend env vars are present in `.env.local`.

You can use `lib/notifications/get-vintasend-service.ts.example` as a starting
point and keep a project-specific implementation in
`lib/notifications/get-vintasend-service.ts`.

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

### Environment variables

| Variable | Provider | Description |
| --- | --- | --- |
| AUTH_PROVIDER | Clerk, Auth0 | Selects which auth strategy to use (`clerk` or `auth0`). |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk | Clerk publishable key. |
| CLERK_SECRET_KEY | Clerk | Clerk secret key. |
| AUTH0_SECRET | Auth0 | Session cookie encryption secret. |
| APP_BASE_URL | Auth0 | Base URL of the app (e.g. `http://localhost:3000`). **Note:** In Auth0 v4, this was renamed from `AUTH0_BASE_URL`. |
| AUTH0_DOMAIN | Auth0 | Auth0 tenant domain without scheme (e.g. `example.us.auth0.com`). **Note:** In Auth0 v4, this was renamed from `AUTH0_ISSUER_BASE_URL` and no longer accepts `https://`. |
| AUTH0_CLIENT_ID | Auth0 | Auth0 application client ID. |
| AUTH0_CLIENT_SECRET | Auth0 | Auth0 application client secret. |
| GITHUB_REPO | Notifications preview | GitHub repository in `owner/repo` format used to fetch templates by commit. |
| GITHUB_API_KEY | Notifications preview | GitHub token with repository read access. |
| GITHUB_API_BASE_URL | Notifications preview | Optional GitHub API base URL (defaults to `https://api.github.com`). |
| GITHUB_TEMPLATES_BASE_PATH | Notifications preview | Optional base path prefixed to template paths before GitHub fetch. |

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
