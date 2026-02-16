'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Error boundary for the notifications page.
 * Displays a user-friendly error message and allows retrying.
 */
interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function NotificationsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error for monitoring/debugging
    console.error('Notifications page error:', error);
  }, [error]);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          {/* Error Icon & Title */}
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-destructive mb-2">
                Failed to load notifications
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                An error occurred while fetching your notifications. This might be temporary.
                Please try again or contact support if the problem persists.
              </p>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 p-3 bg-muted rounded text-xs">
                  <summary className="cursor-pointer font-mono text-muted-foreground mb-2">
                    Error details
                  </summary>
                  <pre className="font-mono text-destructive overflow-auto max-h-32">
                    {error.message}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6">
                <Button
                  onClick={() => reset()}
                  className="gap-2"
                  variant="default"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = '/';
                  }}
                  variant="outline"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Helpful Information */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-3">What you can try:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Refresh the page using the button above</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Clear your browser cache and cookies</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Check your internet connection</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Try again in a few moments</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
