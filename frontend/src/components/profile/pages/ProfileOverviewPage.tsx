import { Book } from "lucide-react";
import type { ShowcaseRepo } from "./profileTypes";

interface ProfileOverviewPageProps {
  pinnedRepositories: ShowcaseRepo[];
  contributions: number[][];
  onOpenWorkspace: (repoName: string) => void;
  languageColor: (language: string) => string;
  contributionColor: (level: number) => string;
}

export default function ProfileOverviewPage({
  pinnedRepositories,
  contributions,
  onOpenWorkspace,
  languageColor,
  contributionColor,
}: ProfileOverviewPageProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#24292f]">Pinned</h2>
          <button type="button" className="text-xs text-[#0969da] hover:underline">Customize your pins</button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {pinnedRepositories.map((repo) => (
            <article key={`pin-${repo.name}`} className="border border-[#d1d9e0] rounded-md p-4 bg-white">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenWorkspace(repo.name)}
                  className="text-sm font-semibold text-[#0969da] hover:underline inline-flex items-center gap-2"
                >
                  <Book size={14} className="text-[#57606a]" />
                  {repo.name}
                </button>
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-[#d1d9e0] text-[#57606a]">
                  {repo.visibility}
                </span>
              </div>
              <p className="mt-3 text-sm text-[#57606a] min-h-[36px]">{repo.description || "No description provided."}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-[#57606a]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} />
                {repo.language}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border border-[#d1d9e0] rounded-md p-4 bg-white">
        <div className="flex items-center justify-between text-sm text-[#57606a]">
          <p>
            <span className="font-semibold text-[#24292f]">1,134 contributions</span> in the last year
          </p>
          <button type="button" className="text-xs text-[#0969da] hover:underline">Contribution settings</button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="inline-flex gap-[3px] min-w-[760px]">
            {contributions.map((week, index) => (
              <div key={`week-${index}`} className="flex flex-col gap-[3px]">
                {week.map((level, dayIndex) => (
                  <span
                    key={`cell-${index}-${dayIndex}`}
                    className="h-[10px] w-[10px] rounded-[2px]"
                    style={{ backgroundColor: contributionColor(level) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs text-[#57606a] flex items-center justify-between">
          <span>Learn how we count contributions</span>
          <div className="inline-flex items-center gap-2">
            <span>Less</span>
            <div className="inline-flex gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <span key={`legend-${level}`} className="h-[10px] w-[10px] rounded-[2px]" style={{ backgroundColor: contributionColor(level) }} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </section>

      <section className="border border-[#d1d9e0] rounded-md p-4 bg-white">
        <h3 className="text-base font-semibold text-[#24292f]">Activity overview</h3>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5 text-sm text-[#57606a]">
          <div className="border border-[#d8dee4] rounded-md p-4 bg-[#f6f8fa]">
            <p className="text-xs uppercase tracking-wide mb-2">Contributed to</p>
            <p className="text-[#0969da]">Searching96/synergyit</p>
            <p className="text-[#0969da]">ci-cd-demo-next-js</p>
            <p className="mt-2">and 35 other repositories</p>
          </div>
          <div className="border border-[#d8dee4] rounded-md p-4 bg-[#f6f8fa] flex flex-col items-center justify-center">
            <div className="w-full max-w-[220px] h-[120px] relative">
              <span className="absolute top-2 left-8 text-xs text-[#57606a]">57%</span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-[#57606a]">3%</span>
              <span className="absolute top-1/2 right-6 -translate-y-1/2 text-xs text-[#57606a]">Issues</span>
              <div className="absolute left-1/2 top-4 bottom-4 w-px bg-[#238636]" />
              <div className="absolute top-1/2 left-6 right-6 h-px bg-[#238636]" />
            </div>
            <p className="text-xs text-[#57606a]">Code review</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 text-sm text-[#57606a]">
        <h3 className="text-base font-semibold text-[#24292f]">Contribution activity</h3>
        <div className="border border-[#d1d9e0] rounded-md p-4 bg-white space-y-4">
          <div>
            <p className="text-[#24292f]">April 2026</p>
            <p className="mt-1">Created 21 commits in 2 repositories</p>
            <p className="text-[#0969da] mt-1">Searching96/synergyit</p>
            <p className="text-[#0969da]">Searching96/htmlol</p>
          </div>
          <button type="button" className="w-full h-8 rounded-md border border-[#d1d9e0] text-xs text-[#0969da] hover:bg-[#f6f8fa]">
            Show more activity
          </button>
        </div>
      </section>
    </div>
  );
}
