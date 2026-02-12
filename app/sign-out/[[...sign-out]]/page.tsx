import { SignedOut } from "@clerk/nextjs";
import { resolveAuthStrategy } from "@/lib/auth";
import { redirect } from "next/navigation";

export default function SignOutPage() {
  const strategy = resolveAuthStrategy();
  const authProvider = process.env.AUTH_PROVIDER;

  // For Auth0, redirect to the logout endpoint
  if (authProvider === "auth0") {
    redirect(strategy.getSignOutUrl());
  }

  // For Clerk, render the SignedOut component
  return <SignedOut />;
}
