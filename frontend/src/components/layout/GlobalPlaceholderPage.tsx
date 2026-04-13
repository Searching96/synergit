interface GlobalPlaceholderPageProps {
  title: string;
  onBackToProfile: () => void;
  onCreateRepository: () => void;
}

export default function GlobalPlaceholderPage({
  title,
  onBackToProfile,
  onCreateRepository,
}: GlobalPlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-[var(--surface-subtle)] text-[var(--text-primary)]">
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] p-8">
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">{title}</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            This page is currently a placeholder route and will be implemented next.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToProfile}
              className="h-9 px-4 rounded-md border border-[var(--border-input)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            >
              Back to profile
            </button>
            <button
              type="button"
              onClick={onCreateRepository}
              className="h-9 px-4 rounded-md bg-[var(--accent-primary)] text-sm font-semibold text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-hover)]"
            >
              New repository
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
