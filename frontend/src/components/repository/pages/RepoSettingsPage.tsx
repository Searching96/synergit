import { AlertTriangle } from "lucide-react";

const LEFT_NAV_GROUPS = [
  {
    title: "General",
    items: ["General", "Access", "Collaborators", "Moderation options"],
  },
  {
    title: "Code and automation",
    items: ["Branches", "Tags", "Rules", "Actions", "Webhooks"],
  },
  {
    title: "Security and quality",
    items: ["Advanced Security", "Deploy keys", "Secret and variables"],
  },
  {
    title: "Integrations",
    items: ["GitHub Apps", "Email notifications"],
  },
];

export default function RepoSettingsPage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-4">
      <aside className="border border-[#d8dee4] rounded-md bg-white py-3">
        {LEFT_NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-3">
            <p className="px-4 text-xs uppercase tracking-wide font-semibold text-[#57606a]">{group.title}</p>
            <div className="mt-1 space-y-0.5">
              {group.items.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={`w-full px-4 py-1.5 text-left text-sm ${
                    group.title === "General" && index === 0
                      ? "bg-[#f6f8fa] text-[#24292f] border-l-2 border-[#0969da] font-semibold"
                      : "text-[#57606a] hover:bg-[#f6f8fa]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <section className="space-y-5 min-w-0">
        <h2 className="text-[44px] leading-[1.2] font-semibold text-[#24292f]">General</h2>

        <div className="border border-[#d8dee4] rounded-md bg-white p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#24292f]">Repository name</p>
            <div className="mt-2 flex items-center gap-2 max-w-[440px]">
              <input
                type="text"
                readOnly
                value="synergit"
                className="h-9 flex-1 rounded-md border border-[#d1d9e0] bg-white px-3 text-sm text-[#24292f]"
              />
              <button type="button" className="h-9 px-3 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-sm text-[#24292f]">
                Rename
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#24292f]">Default branch</p>
            <p className="text-sm text-[#57606a] mt-1">The default branch in this repository is master.</p>
            <div className="mt-2 max-w-[240px]">
              <input
                type="text"
                readOnly
                value="master"
                className="h-9 w-full rounded-md border border-[#d1d9e0] bg-[#f6f8fa] px-3 text-sm text-[#57606a]"
              />
            </div>
          </div>
        </div>

        <div className="border border-[#d8dee4] rounded-md bg-white p-4 space-y-3">
          <p className="text-lg font-semibold text-[#24292f]">Features</p>

          <label className="flex items-start gap-2 text-sm text-[#24292f]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Wikis</span>
              <span className="block text-[#57606a]">Wikis host documentation for your repository.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[#24292f]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Issues</span>
              <span className="block text-[#57606a]">Issues integrate lightweight task tracking into your repository.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[#24292f]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Pull requests</span>
              <span className="block text-[#57606a]">Pull requests offer a way to suggest changes in your repository.</span>
            </span>
          </label>
        </div>

        <div className="border border-[#d8dee4] rounded-md bg-white p-4 space-y-3">
          <p className="text-lg font-semibold text-[#24292f]">Pull Requests</p>

          <label className="flex items-start gap-2 text-sm text-[#24292f]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Allow merge commits</span>
              <span className="block text-[#57606a]">Add all commits from the head branch to the base branch with a merge commit.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[#24292f]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Allow squash merging</span>
              <span className="block text-[#57606a]">Combine all commits from the head branch into a single commit in the base branch.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[#24292f]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Allow rebase merging</span>
              <span className="block text-[#57606a]">Add all commits from the head branch onto the base branch individually.</span>
            </span>
          </label>
        </div>

        <div className="border border-[#cf222e] rounded-md bg-white p-4 space-y-3">
          <p className="text-lg font-semibold text-[#cf222e] inline-flex items-center gap-2">
            <AlertTriangle size={18} />
            Danger Zone
          </p>

          <div className="border border-[#f7c6c7] rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#24292f]">Change repository visibility</p>
              <p className="text-sm text-[#57606a]">This repository is currently public.</p>
            </div>
            <button type="button" className="h-8 px-3 rounded-md border border-[#cf222e] text-[#cf222e] text-sm font-semibold bg-white hover:bg-[#ffebe9]">
              Change visibility
            </button>
          </div>

          <div className="border border-[#f7c6c7] rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#24292f]">Delete this repository</p>
              <p className="text-sm text-[#57606a]">Once you delete a repository, there is no going back.</p>
            </div>
            <button type="button" className="h-8 px-3 rounded-md border border-[#cf222e] text-[#cf222e] text-sm font-semibold bg-white hover:bg-[#ffebe9]">
              Delete repository
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
