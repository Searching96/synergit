import { Search, Star } from "lucide-react";
import type { StarredRepo } from "./profileTypes";

interface ProfileStarsPageProps {
  starredRepos: StarredRepo[];
  languageColor: (language: string) => string;
}

export default function ProfileStarsPage({ starredRepos, languageColor }: ProfileStarsPageProps) {
  return (
    <div className="space-y-6">
      <section className="border border-[#30363d] rounded-md bg-[#0d1117]">
        <div className="px-4 py-3 border-b border-[#21262d] flex items-center justify-between">
          <p className="text-xl text-[#f0f6fc]">Lists (0)</p>
          <div className="flex items-center gap-2">
            <button type="button" className="h-8 px-3 rounded-md border border-[#30363d] bg-[#21262d] text-xs text-[#c9d1d9]">Sort</button>
            <button type="button" className="h-8 px-3 rounded-md bg-[#238636] text-xs font-semibold text-white">Create list</button>
          </div>
        </div>
        <div className="min-h-[160px] flex items-center justify-center text-center p-6">
          <div>
            <p className="text-[36px] leading-[40px] font-semibold text-[#f0f6fc]">Create your first list</p>
            <p className="text-[#8b949e] mt-2">Lists make it easier to organize and curate repositories that you have starred.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-2xl text-[#f0f6fc]">Stars</h3>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full md:w-[320px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
            <input
              type="text"
              readOnly
              value="Search stars"
              className="h-8 w-full rounded-md border border-[#30363d] bg-[#0d1117] pl-9 pr-3 text-sm text-[#8b949e]"
            />
          </div>
          <button type="button" className="h-8 px-3 rounded-md border border-[#30363d] bg-[#21262d] text-xs text-[#c9d1d9]">Search</button>
          <button type="button" className="h-8 px-3 rounded-md border border-[#30363d] bg-[#21262d] text-xs text-[#c9d1d9]">Type: All</button>
          <button type="button" className="h-8 px-3 rounded-md border border-[#30363d] bg-[#21262d] text-xs text-[#c9d1d9]">Language</button>
          <button type="button" className="h-8 px-3 rounded-md border border-[#30363d] bg-[#21262d] text-xs text-[#c9d1d9]">Sort by: Recently starred</button>
        </div>

        <div className="border-t border-[#21262d]">
          {starredRepos.map((repo) => (
            <article key={`${repo.owner}/${repo.name}`} className="py-6 border-b border-[#21262d] flex items-start justify-between gap-4">
              <div>
                <p className="text-[28px] leading-[32px] text-[#58a6ff] font-semibold">
                  {repo.owner} / {repo.name}
                </p>
                <p className="mt-2 text-sm text-[#8b949e] max-w-[760px]">{repo.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#8b949e]">
                  {repo.language ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} />
                      {repo.language}
                    </span>
                  ) : null}
                  <span>★ {repo.stars}</span>
                  <span>⑂ {repo.forks}</span>
                  <span>{repo.updatedText}</span>
                </div>
              </div>

              <button type="button" className="h-7 px-3 rounded-md border border-[#30363d] bg-[#21262d] text-xs text-[#c9d1d9] inline-flex items-center gap-2">
                <Star size={12} />
                Starred
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
