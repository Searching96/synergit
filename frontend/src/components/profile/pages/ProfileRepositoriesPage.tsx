import { Star } from "lucide-react";
import type { ShowcaseRepo } from "./profileTypes";

interface ProfileRepositoriesPageProps {
  profileRepositories: ShowcaseRepo[];
  onOpenWorkspace: (repoName: string) => void;
  languageColor: (language: string) => string;
}

export default function ProfileRepositoriesPage({
  profileRepositories,
  onOpenWorkspace,
  languageColor,
}: ProfileRepositoriesPageProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="text"
          readOnly
          value="Find a repository..."
          className="h-8 rounded-md border border-[#d1d9e0] bg-white px-3 text-sm text-[#57606a] w-full md:flex-1 md:min-w-0"
        />
        <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
          <button type="button" className="h-8 px-3 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-xs text-[#24292f]">Type</button>
          <button type="button" className="h-8 px-3 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-xs text-[#24292f]">Language</button>
          <button type="button" className="h-8 px-3 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-xs text-[#24292f]">Sort</button>
          <button type="button" className="h-8 px-3 rounded-md bg-[#238636] text-xs font-semibold text-white">New</button>
        </div>
      </div>

      <div className="border-t border-[#d8dee4]">
        {profileRepositories.map((repo) => (
          <article key={`repo-${repo.name}`} className="py-6 border-b border-[#d8dee4] flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenWorkspace(repo.name)}
                  className="text-xl leading-6 font-semibold text-[#0969da] hover:underline text-left"
                >
                  {repo.name}
                </button>
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-[#d1d9e0] text-[#57606a]">
                  {repo.visibility}
                </span>
              </div>

              {repo.description && <p className="mt-2 text-sm text-[#57606a] max-w-[760px]">{repo.description}</p>}

              <div className="mt-3 flex items-center gap-4 text-xs text-[#57606a] flex-wrap">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} />
                  {repo.language}
                </span>
                <span>★ {repo.stars}</span>
                <span>⑂ {repo.forks}</span>
                <span>{repo.updatedText}</span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button type="button" className="h-7 px-3 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-xs text-[#24292f] inline-flex items-center gap-2">
                <Star size={12} />
                Star
              </button>
              <div className="h-6 w-[90px] flex items-end gap-[2px]">
                {repo.sparkline.map((height, idx) => (
                  <span key={`spark-${repo.name}-${idx}`} className="w-[3px] rounded-sm bg-[#2ea043]" style={{ height: `${height * 2}px`, opacity: 0.8 }} />
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="pt-2 flex justify-center items-center gap-4 text-sm text-[#57606a]">
        <button type="button" className="hover:text-[#0969da]">&lt; Previous</button>
        <button type="button" className="text-[#0969da]">Next &gt;</button>
      </div>
    </div>
  );
}
