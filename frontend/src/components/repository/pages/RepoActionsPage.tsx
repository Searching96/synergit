import { CheckCircle2, Clock3, Ellipsis, Hash } from "lucide-react";

const WORKFLOW_RUNS = [
  {
    workflow: "Graph Update: go_modules in /backend #1290306455",
    subtext: "Dependency Graph #1 by dependabot",
    branch: "master",
    startedAt: "Mar 24, 8:04 AM GMT+7",
    duration: "39s",
  },
];

const SIDEBAR_ITEMS = [
  "All workflows",
  "Dependency Graph",
  "Management",
  "Caches",
  "Attestations",
  "Runners",
  "Usage metrics",
  "Performance metrics",
];

export default function RepoActionsPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
      <aside className="border border-[#d8dee4] rounded-md bg-white py-3">
        <div className="px-4 mb-2 flex items-center justify-between gap-2">
          <p className="text-[32px] leading-[1.2] font-semibold text-[#24292f]">Actions</p>
          <button
            type="button"
            className="h-8 px-3 rounded-md bg-[#2da44e] text-white text-sm font-semibold hover:bg-[#2c974b]"
          >
            New workflow
          </button>
        </div>

        <nav className="space-y-1">
          {SIDEBAR_ITEMS.map((item, idx) => (
            <button
              key={item}
              type="button"
              className={`w-full text-left px-4 py-2 text-sm ${
                idx === 0
                  ? "bg-[#f6f8fa] text-[#24292f] border-l-2 border-[#0969da] font-semibold"
                  : "text-[#57606a] hover:bg-[#f6f8fa]"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="space-y-4 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl leading-[1.2] font-semibold text-[#24292f]">All workflows</h2>
            <p className="text-sm text-[#57606a]">Showing runs from all workflows</p>
          </div>

          <div className="w-full max-w-[360px]">
            <input
              type="text"
              readOnly
              value="Filter workflow runs"
              className="h-8 w-full rounded-md border border-[#d1d9e0] bg-white px-3 text-sm text-[#57606a]"
            />
          </div>
        </div>

        <div className="border border-[#d8dee4] rounded-md bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#d8dee4] text-sm font-semibold text-[#24292f]">1 workflow run</div>

          {WORKFLOW_RUNS.map((run) => (
            <article key={run.workflow} className="px-4 py-4 grid grid-cols-[minmax(0,1fr)_100px_210px_90px] gap-4 items-start border-t border-[#d8dee4] first:border-t-0">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 text-[#24292f] font-semibold">
                  <CheckCircle2 size={18} className="text-[#1f883d] shrink-0" />
                  <p className="truncate">{run.workflow}</p>
                </div>
                <p className="mt-1 text-sm text-[#57606a] inline-flex items-center gap-1">
                  <Hash size={14} />
                  {run.subtext}
                </p>
              </div>

              <span className="text-xs text-[#0969da] bg-[#ddf4ff] px-2 py-1 rounded-full w-fit">{run.branch}</span>

              <div className="text-sm text-[#57606a]">
                <p>{run.startedAt}</p>
                <p className="mt-1 inline-flex items-center gap-1">
                  <Clock3 size={14} />
                  {run.duration}
                </p>
              </div>

              <div className="flex justify-end">
                <button type="button" className="h-8 w-8 rounded-md border border-[#d1d9e0] bg-white hover:bg-[#f6f8fa] inline-flex items-center justify-center text-[#57606a]" aria-label="More actions">
                  <Ellipsis size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
