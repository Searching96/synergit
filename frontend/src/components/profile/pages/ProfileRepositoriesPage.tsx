import { Star } from "lucide-react";
import type { ShowcaseRepo } from "./profileTypes";

function buildSparklinePoints(values: number[], width: number, height: number, padding = 2): string {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x = padding + (index * usableWidth) / Math.max(values.length - 1, 1);
      const normalized = (value - min) / range;
      const y = padding + (1 - normalized) * usableHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

interface ProfileRepositoriesPageProps {
  profileRepositories: ShowcaseRepo[];
  onOpenWorkspace: (repoName: string) => void;
  onCreateRepository: () => void;
  languageColor: (language: string) => string;
}

export default function ProfileRepositoriesPage({
  profileRepositories,
  onOpenWorkspace,
  onCreateRepository,
  languageColor,
}: ProfileRepositoriesPageProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="text"
          readOnly
          value="Find a repository..."
          className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-secondary)] w-full md:flex-1 md:min-w-0"
        />
        <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
          <button type="button" className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]">Type</button>
          <button type="button" className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]">Language</button>
          <button type="button" className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]">Sort</button>
          <button
            type="button"
            onClick={onCreateRepository}
            className="h-8 px-3 rounded-md bg-[var(--accent-secondary)] text-xs font-semibold text-[var(--text-on-accent)]"
          >
            New
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border-muted)]">
        {profileRepositories.map((repo) => (
          <article key={`repo-${repo.name}`} className="py-6 border-b border-[var(--border-muted)] flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenWorkspace(repo.name)}
                  className="text-xl leading-6 font-semibold text-[var(--text-link)] hover:underline text-left"
                >
                  {repo.name}
                </button>
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
                  {repo.visibility}
                </span>
              </div>

              {repo.description && <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-[760px]">{repo.description}</p>}

              <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-secondary)] flex-wrap">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} />
                  {repo.language}
                </span>
                <span>★ {repo.stars}</span>
                <span>⑂ {repo.forks}</span>
                <span>{repo.updatedText}</span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-2">
              <button type="button" className="h-7 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] inline-flex items-center gap-2">
                <Star size={12} />
                Star
              </button>
              <div className="h-6 w-[92px]">
                <svg viewBox="0 0 92 24" className="h-full w-full" role="img" aria-label={`${repo.name} commit trend`}>
                  <polyline
                    points={buildSparklinePoints(repo.sparkline, 92, 24)}
                    fill="none"
                    stroke="var(--accent-sparkline)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="pt-2 flex justify-center items-center gap-4 text-sm text-[var(--text-secondary)]">
        <button type="button" className="hover:text-[var(--text-link)]">&lt; Previous</button>
        <button type="button" className="text-[var(--text-link)]">Next &gt;</button>
      </div>
    </div>
  );
}

