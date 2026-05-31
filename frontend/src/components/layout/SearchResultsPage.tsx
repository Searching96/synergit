import { useEffect, useState } from "react";
import { MarkGithubIcon, SearchIcon, StarIcon } from "@primer/octicons-react";
import type { Repository } from "../../types";
import { starsApi } from "../../services/api";
import StarButton from "../shared/StarButton";

interface SearchResultsPageProps {
  repos: Repository[];
  query: string;
  currentUsername: string;
  onSearch: (query: string) => void;
  onOpenRepo: (repo: Repository) => void;
  onHome: () => void;
}

function formatUpdated(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `Updated on ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function SearchResultsPage({ repos, query, currentUsername, onSearch, onOpenRepo, onHome }: SearchResultsPageProps) {
  const [text, setText] = useState(query);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void starsApi
      .listStarred()
      .then((list) => {
        if (!cancelled) setStarredIds(new Set(list.map((r) => r.id)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? repos.filter(
        (r) =>
          `${r.owner || currentUsername}/${r.name}`.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q),
      )
    : repos;

  const filters = [
    { label: "Repositories", count: results.length, active: true },
    { label: "Code" },
    { label: "Issues" },
    { label: "Pull requests" },
    { label: "Users" },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <header className="h-14 px-4 md:px-6 flex items-center gap-3 border-b border-[var(--border-muted)] bg-[var(--surface-page)]">
        <button type="button" onClick={onHome} aria-label="Home" className="h-8 w-8 inline-flex items-center justify-center text-[var(--text-primary)] shrink-0">
          <MarkGithubIcon size={32} />
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(text.trim());
          }}
          className="relative flex-1 max-w-[640px]"
        >
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search or jump to..."
            className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-9 pr-3 text-sm text-[var(--text-primary)]"
          />
        </form>
      </header>

      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8">
        <aside className="hidden lg:block text-sm">
          <h2 className="font-semibold mb-2">Filter by</h2>
          <div className="flex flex-col gap-0.5">
            {filters.map((f) => (
              <button
                key={f.label}
                type="button"
                className={`flex items-center justify-between px-3 py-1.5 rounded-md text-left ${
                  f.active
                    ? "bg-[var(--surface-subtle)] font-semibold text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                }`}
              >
                <span>{f.label}</span>
                {f.count != null ? <span className="text-xs">{f.count}</span> : null}
              </button>
            ))}
          </div>
        </aside>

        <main>
          <div className="pb-3 border-b border-[var(--border-muted)] text-sm font-semibold">
            {results.length} {results.length === 1 ? "result" : "results"}
          </div>
          {results.length === 0 ? (
            <p className="py-8 text-sm text-[var(--text-secondary)]">No repositories matched “{query}”.</p>
          ) : (
            <ul>
              {results.map((repo) => {
                const owner = repo.owner || currentUsername;
                const lang = repo.primary_language || repo.language;
                return (
                  <li key={repo.id} className="py-4 border-b border-[var(--border-muted)] flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button type="button" onClick={() => onOpenRepo(repo)} className="text-[var(--text-link)] text-lg font-semibold hover:underline">
                        {owner}/{repo.name}
                      </button>
                      {repo.description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{repo.description}</p> : null}
                      <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        {lang ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-3 w-3 rounded-full bg-[var(--accent-line)]" />
                            {lang}
                          </span>
                        ) : null}
                        {typeof repo.stars === "number" ? (
                          <span className="inline-flex items-center gap-1">
                            <StarIcon size={14} />
                            {repo.stars}
                          </span>
                        ) : null}
                        {repo.updated_at ? <span>{formatUpdated(repo.updated_at)}</span> : null}
                      </div>
                    </div>
                    <StarButton repoId={repo.id} initialStarred={starredIds.has(repo.id)} />
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
