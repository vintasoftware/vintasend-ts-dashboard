import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { resolveAuthStrategy } from "@/lib/auth";
import { AuthProvider } from "@/lib/auth/auth-context";
import { assertValidAuthConfig } from "@/lib/auth/validate-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vintasend Dashboard",
  description: "Authentication-enabled dashboard for Vintasend",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const strategy = resolveAuthStrategy();
  assertValidAuthConfig(strategy);
  const ProviderComponent = strategy.getProviderComponent();
  const currentUser = await strategy.getCurrentUser();
  const signInUrl = strategy.getSignInUrl();
  const signOutUrl = strategy.getSignOutUrl();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ProviderComponent>
          <AuthProvider
            initialUser={currentUser}
            signInUrl={signInUrl}
            signOutUrl={signOutUrl}
          >
            {children}
          </AuthProvider>
        </ProviderComponent>
      </body>
    </html>
  );
}
