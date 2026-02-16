export default function AccountPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences and security settings.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Section */}
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">Profile Information</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Update your profile details and personal information.
            </p>
            <p className="text-muted-foreground">Profile settings coming soon...</p>
          </div>

          {/* Security Section */}
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">Security</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Manage your password and security preferences.
            </p>
            <p className="text-muted-foreground">Security settings managed by your authentication provider.</p>
          </div>

          {/* Preferences Section */}
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">Preferences</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Customize your dashboard experience.
            </p>
            <p className="text-muted-foreground">Preference settings coming soon...</p>
          </div>
        </div>
      </div>
    </main>
  );
}
