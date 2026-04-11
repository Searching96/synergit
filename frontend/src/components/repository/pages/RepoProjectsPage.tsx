import { Plus, Search, Table2, Unlink } from "lucide-react";

export default function RepoProjectsPage() {
  return (
    <div className="space-y-4">
      <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-6 bg-gradient-to-r from-[var(--surface-violet-subtle)] via-[var(--surface-subtle)] to-[var(--surface-blue-subtle)]">
          <h2 className="text-[42px] leading-[1.2] font-semibold text-[var(--text-primary)]">Welcome to Projects</h2>
          <p className="mt-3 text-lg text-[var(--text-secondary)] max-w-[900px]">
            Built to be flexible and adaptable, Projects gives you a live canvas to filter, sort, and group issues and pull requests in a table, board, or roadmap.
          </p>
          <button
            type="button"
            className="mt-4 h-10 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] text-base font-semibold hover:bg-[var(--surface-button-muted)]"
          >
            Learn more
          </button>
        </div>
      </section>

      <section className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            readOnly
            value="is:open"
            className="h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-9 pr-3 text-sm text-[var(--text-secondary)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          <button
            type="button"
            className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2"
          >
            <Unlink size={14} />
            Link a project
          </button>
          <button
            type="button"
            className="h-9 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[var(--accent-primary-hover)]"
          >
            <Plus size={14} />
            New project
          </button>
        </div>
      </section>

      <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] min-h-[340px] flex items-center justify-center">
        <div className="text-center space-y-2">
          <Table2 size={30} className="mx-auto text-[var(--text-muted)]" />
          <p className="text-[44px] leading-[1.2] font-semibold text-[var(--text-primary)]">Provide quick access to relevant projects.</p>
          <p className="text-xl text-[var(--text-secondary)]">Add projects to view them here.</p>
        </div>
      </section>
    </div>
  );
}

