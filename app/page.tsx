import { APP_NAME, APP_PHASE } from "@/lib/app-config";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-6 py-12 text-[var(--color-text)]">
      <section className="mx-auto flex min-h-[70vh] max-w-5xl items-center">
        <div className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-2xl shadow-black/20 md:p-12">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            {APP_PHASE}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">{APP_NAME}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-muted)] md:text-lg">
            The production application scaffold is online. Product features remain intentionally
            disabled until the Phase 0 contracts are accepted.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-[var(--color-border)] px-4 py-2">
              Next.js App Router
            </span>
            <span className="rounded-full border border-[var(--color-border)] px-4 py-2">
              TypeScript
            </span>
            <span className="rounded-full border border-[var(--color-border)] px-4 py-2">
              Tailwind CSS
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
