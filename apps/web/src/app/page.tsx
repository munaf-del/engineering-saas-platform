import { STANDARDS_REGISTRY } from '@eng/shared';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">EngPlatform</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Structural &amp; Geotechnical Engineering Platform
        </p>
        <div className="mt-8 rounded-lg border bg-card p-6 text-left">
          <h2 className="text-lg font-semibold">Supported Standards</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {STANDARDS_REGISTRY.map((s) => (
              <li key={s.code} className="flex justify-between border-b pb-2 last:border-0">
                <span className="font-mono text-foreground">{s.code}:{s.edition}</span>
                <span className="ml-4 text-right">{s.title}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Platform status: scaffold deployed. Auth, projects, and calculators coming next.
        </p>
      </div>
    </main>
  );
}
