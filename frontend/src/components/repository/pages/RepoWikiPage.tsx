import { BookOpen } from "lucide-react";

interface RepoWikiPageProps {
  repoName: string;
}

export default function RepoWikiPage({ repoName }: RepoWikiPageProps) {
  return (
    <section className="min-h-[560px] border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] flex items-center justify-center">
      <div className="text-center space-y-3 max-w-[920px] px-6">
        <BookOpen size={30} className="mx-auto text-[var(--text-muted)]" />
        <h2 className="text-[48px] leading-[1.2] font-semibold text-[var(--text-primary)]">Welcome to the {repoName} wiki!</h2>
        <p className="text-[32px] leading-[1.35] text-[var(--text-secondary)]">
          Wikis provide a place in your repository to lay out the roadmap of your project, show the current status, and document software better, together.
        </p>
        <button
          type="button"
          className="mt-2 h-10 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold text-base hover:bg-[var(--accent-primary-hover)]"
        >
          Create the first page
        </button>
      </div>
    </section>
  );
}

