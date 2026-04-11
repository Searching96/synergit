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
      <aside className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] py-3">
        {LEFT_NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-3">
            <p className="px-4 text-xs uppercase tracking-wide font-semibold text-[var(--text-secondary)]">{group.title}</p>
            <div className="mt-1 space-y-0.5">
              {group.items.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={`w-full px-4 py-1.5 text-left text-sm ${
                    group.title === "General" && index === 0
                      ? "bg-[var(--surface-subtle)] text-[var(--text-primary)] border-l-2 border-[var(--text-link)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
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
        <h2 className="text-[44px] leading-[1.2] font-semibold text-[var(--text-primary)]">General</h2>

        <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Repository name</p>
            <div className="mt-2 flex items-center gap-2 max-w-[440px]">
              <input
                type="text"
                readOnly
                value="synergit"
                className="h-9 flex-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
              />
              <button type="button" className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)]">
                Rename
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Default branch</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">The default branch in this repository is master.</p>
            <div className="mt-2 max-w-[240px]">
              <input
                type="text"
                readOnly
                value="master"
                className="h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-3 text-sm text-[var(--text-secondary)]"
              />
            </div>
          </div>
        </div>

        <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-3">
          <p className="text-lg font-semibold text-[var(--text-primary)]">Features</p>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Wikis</span>
              <span className="block text-[var(--text-secondary)]">Wikis host documentation for your repository.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Issues</span>
              <span className="block text-[var(--text-secondary)]">Issues integrate lightweight task tracking into your repository.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Pull requests</span>
              <span className="block text-[var(--text-secondary)]">Pull requests offer a way to suggest changes in your repository.</span>
            </span>
          </label>
        </div>

        <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-3">
          <p className="text-lg font-semibold text-[var(--text-primary)]">Pull Requests</p>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Allow merge commits</span>
              <span className="block text-[var(--text-secondary)]">Add all commits from the head branch to the base branch with a merge commit.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Allow squash merging</span>
              <span className="block text-[var(--text-secondary)]">Combine all commits from the head branch into a single commit in the base branch.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Allow rebase merging</span>
              <span className="block text-[var(--text-secondary)]">Add all commits from the head branch onto the base branch individually.</span>
            </span>
          </label>
        </div>

        <div className="border border-[var(--text-danger)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-3">
          <p className="text-lg font-semibold text-[var(--text-danger)] inline-flex items-center gap-2">
            <AlertTriangle size={18} />
            Danger Zone
          </p>

          <div className="border border-[var(--border-danger-muted)] rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Change repository visibility</p>
              <p className="text-sm text-[var(--text-secondary)]">This repository is currently public.</p>
            </div>
            <button type="button" className="h-8 px-3 rounded-md border border-[var(--text-danger)] text-[var(--text-danger)] text-sm font-semibold bg-[var(--surface-canvas)] hover:bg-[var(--surface-danger-subtle)]">
              Change visibility
            </button>
          </div>

          <div className="border border-[var(--border-danger-muted)] rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Delete this repository</p>
              <p className="text-sm text-[var(--text-secondary)]">Once you delete a repository, there is no going back.</p>
            </div>
            <button type="button" className="h-8 px-3 rounded-md border border-[var(--text-danger)] text-[var(--text-danger)] text-sm font-semibold bg-[var(--surface-canvas)] hover:bg-[var(--surface-danger-subtle)]">
              Delete repository
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

