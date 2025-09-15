export function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          EA Plan 05
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          AI-Powered Enterprise Architecture Management Platform
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  )
}