export default async function ProfilePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your profile information.
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* User Information */}
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">User Information</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your profile details are connected to your authentication provider.
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Provider
                </p>
                <p className="text-base mt-1">
                  {process.env.AUTH_PROVIDER === 'clerk'
                    ? 'Clerk'
                    : process.env.AUTH_PROVIDER === 'auth0'
                      ? 'Auth0'
                      : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  ID
                </p>
                <p className="text-base mt-1 font-mono text-xs break-all">
                  (Provided by {process.env.AUTH_PROVIDER || 'your auth provider'})
                </p>
              </div>
            </div>
          </div>

          {/* Edit Profile */}
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">Edit Profile</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Profile management is handled by your authentication provider.
            </p>
            <p className="text-muted-foreground">
              To update your profile information, please use your authentication provider&apos;s account management interface.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
