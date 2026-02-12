"use client";

import Image from "next/image";
import { useAuth } from "@/lib/auth/auth-context";

export function AuthStatus() {
  const { user, isAuthenticated, signOutUrl } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <a
        href={`/sign-in`}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        Sign In
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.imageUrl && (
        <Image
          src={user.imageUrl}
          alt={user.name || "User avatar"}
          className="w-8 h-8 rounded-full"
          width={32}
          height={32}
        />
      )}
      <div className="flex flex-col">
        {user.name && (
          <span className="text-sm font-medium text-gray-900">
            {user.name}
          </span>
        )}
        {user.email && (
          <span className="text-xs text-gray-500">{user.email}</span>
        )}
      </div>
      <a
        href={signOutUrl}
        className="text-sm text-red-600 hover:text-red-800 underline ml-2"
      >
        Sign Out
      </a>
    </div>
  );
}
