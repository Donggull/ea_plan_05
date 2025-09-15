export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your EA Plan 05 dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Projects
          </h3>
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="text-sm text-muted-foreground">Active projects</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Documents
          </h3>
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="text-sm text-muted-foreground">Documents processed</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            AI Analysis
          </h3>
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="text-sm text-muted-foreground">Analysis completed</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Tickets
          </h3>
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="text-sm text-muted-foreground">Operation tickets</p>
        </div>
      </div>
    </div>
  )
}