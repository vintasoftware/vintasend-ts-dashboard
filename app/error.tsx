"use client";

import { useEffect } from "react";
import Link from "next/link";

const isConfigurationError = (message: string): boolean => {
  return (
    message.includes("AUTH_PROVIDER env var is required") ||
    message.includes("Unsupported auth provider") ||
    message.includes("Missing required auth configuration")
  );
};

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";
  const showConfigDetails = isDev && isConfigurationError(error.message);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold">Dashboard configuration error</h1>
      <p className="text-base text-slate-700">
        The dashboard could not start because authentication settings are
        missing or invalid.
      </p>
      {showConfigDetails && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Details</p>
          <p className="mt-2 break-words">{error.message}</p>
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Retry
        </button>
        <Link
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          href="/"
        >
          Go to home
        </Link>
      </div>
    </main>
  );
}
