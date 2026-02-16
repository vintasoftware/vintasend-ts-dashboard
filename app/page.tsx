export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
            Vintasend Dashboard
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Authenticated with pluggable auth strategies (Clerk / Auth0)
          </p>
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Phase 4 Implementation Complete:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
              <li>✓ Middleware protecting routes</li>
              <li>✓ Auth provider integrated in layout</li>
              <li>✓ AuthContext providing user state</li>
              <li>✓ AuthStatus component displaying user info</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
