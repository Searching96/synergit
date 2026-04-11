import { Bot, CircleHelp, Image as ImageIcon, Info, Link2, Send, Sparkles } from "lucide-react";

const QUICK_ACTIONS = [
  {
    title: "Explain repository",
    description: "Let the agent help you understand the codebase",
  },
  {
    title: "Improve test coverage",
    description: "Analyze the codebase and improve coverage",
  },
  {
    title: "Create a plan",
    description: "Plan before making changes to the codebase",
  },
];

export default function RepoAgentsPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
      <aside className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] py-3">
        <button
          type="button"
          className="w-full px-4 py-2 text-left text-sm font-semibold text-[var(--text-primary)] border-l-2 border-[var(--text-link)] bg-[var(--surface-subtle)]"
        >
          Created by me
        </button>
        <button
          type="button"
          className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
        >
          All sessions
        </button>
      </aside>

      <section className="space-y-4 min-w-0">
        <h2 className="text-4xl leading-[1.2] font-semibold text-[var(--text-primary)]">Sessions</h2>

        <div className="border border-[var(--border-muted)] rounded-xl bg-[var(--surface-canvas)] overflow-hidden">
          <div className="px-4 py-3">
            <p className="text-[32px] leading-[1.25] text-[var(--text-secondary)]">Give Copilot a background task to work on</p>
          </div>

          <div className="px-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <button
                type="button"
                className="h-8 w-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] inline-flex items-center justify-center"
                aria-label="Attach link"
              >
                <Link2 size={15} />
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] inline-flex items-center justify-center"
                aria-label="Attach image"
              >
                <ImageIcon size={15} />
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] inline-flex items-center justify-center"
                aria-label="Attach context"
              >
                <CircleHelp size={15} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Auto
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] inline-flex items-center justify-center text-[var(--text-secondary)]"
                aria-label="Send prompt"
              >
                <Send size={15} />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-[var(--border-muted)] bg-[var(--surface-info-subtle)] text-sm text-[var(--text-link)] flex items-start gap-2">
            <Info size={16} className="mt-0.5 shrink-0" />
            Sessions no longer create pull requests by default. Ask for a pull request in your prompt or open one when the session is complete.
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">Get started with agents</p>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <article key={action.title} className="border border-[var(--border-muted)] rounded-xl bg-[var(--surface-canvas)] p-4">
                <div className="inline-flex items-center gap-2 text-[var(--text-primary)]">
                  <Sparkles size={16} />
                  <p className="text-base font-semibold">{action.title}</p>
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{action.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="border border-[var(--border-muted)] rounded-xl bg-[var(--surface-canvas)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-muted)] flex items-center gap-4">
            <button type="button" className="text-base font-semibold text-[var(--text-primary)]">
              Active <span className="text-sm text-[var(--text-secondary)]">0</span>
            </button>
            <button type="button" className="text-base font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Completed <span className="text-sm">0</span>
            </button>
          </div>

          <div className="py-14 text-center space-y-2">
            <Bot size={28} className="mx-auto text-[var(--text-muted)]" />
            <p className="text-[32px] leading-[1.2] font-semibold text-[var(--text-primary)]">There are no sessions yet</p>
            <p className="text-base text-[var(--text-secondary)]">
              Let agents work independently in the background to complete tasks, and then monitor their progress.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

