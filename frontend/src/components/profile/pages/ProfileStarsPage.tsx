import { Search } from "lucide-react";
import { RepoForkedIcon, RepoIcon, StarFillIcon, StarIcon } from "@primer/octicons-react";
import type { StarredRepo } from "./profileTypes";

interface ProfileStarsPageProps {
  starredRepos: StarredRepo[];
  languageColor: (language: string) => string;
}

export default function ProfileStarsPage({ starredRepos, languageColor }: ProfileStarsPageProps) {
  return (
    <div className="space-y-6">
      <section className="border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)]">
        <div className="px-4 py-3 border-b border-[var(--border-muted)] flex items-center justify-between">
          <p className="text-xl text-[var(--text-primary)]">Lists (0)</p>
          <div className="flex items-center gap-2">
            <button type="button" className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]">Sort</button>
            <button type="button" className="h-8 px-3 rounded-md bg-[var(--accent-secondary)] text-xs font-semibold text-[var(--text-on-accent)]">Create list</button>
          </div>
        </div>
        <div className="min-h-[160px] flex items-center justify-center text-center p-6">
          <div>
            <p className="text-[36px] leading-[40px] font-semibold text-[var(--text-primary)]">Create your first list</p>
            <p className="text-[var(--text-secondary)] mt-2">Lists make it easier to organize and curate repositories that you have starred.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-2xl text-[var(--text-primary)]">Stars</h3>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full md:w-[320px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              readOnly
              value="Search stars"
              className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-9 pr-3 text-sm text-[var(--text-secondary)]"
            />
          </div>
          <button type="button" className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]">Search</button>
          <button type="button" className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]">Type: All</button>
          <button type="button" className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]">Language</button>
          <button type="button" className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]">Sort by: Recently starred</button>
        </div>

        <div className="border-t border-[var(--border-muted)]">
          {starredRepos.map((repo) => (
            <article key={`${repo.owner}/${repo.name}`} className="py-6 border-b border-[var(--border-muted)] flex items-start justify-between gap-4">
              <div>
                <p className="text-[28px] leading-[32px] text-[var(--text-link)] font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <RepoIcon size={16} className="text-[var(--text-secondary)]" />
                    {repo.owner} / {repo.name}
                  </span>
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-[760px]">{repo.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
                  {repo.language ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} />
                      {repo.language}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <StarIcon size={12} />
                    {repo.stars}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <RepoForkedIcon size={12} />
                    {repo.forks}
                  </span>
                  <span>{repo.updatedText}</span>
                </div>
              </div>

              <button type="button" className="h-7 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] inline-flex items-center gap-2">
                <StarFillIcon size={12} />
                Starred
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

