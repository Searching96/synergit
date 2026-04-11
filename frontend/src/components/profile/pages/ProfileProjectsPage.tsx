import { Boxes } from "lucide-react";

export default function ProfileProjectsPage() {
  return (
    <div className="space-y-4">
      <section className="border border-[var(--border-default)] rounded-lg overflow-hidden bg-gradient-to-r from-[var(--surface-subtle)] to-[var(--color-e9f0f8)]">
        <div className="p-6 md:p-8 max-w-[760px]">
          <h2 className="text-[40px] leading-[44px] font-semibold text-[var(--text-primary)]">Welcome to Projects</h2>
          <p className="mt-3 text-[var(--text-secondary)] text-lg leading-8">
            Built to be flexible and adaptable, Projects gives you a live canvas to filter, sort, and group issues and pull requests.
          </p>
          <button type="button" className="mt-5 h-10 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]">
            Learn more
          </button>
        </div>
      </section>

      <section className="border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] min-h-[320px] flex items-center justify-center">
        <div className="text-center space-y-3 max-w-[460px]">
          <Boxes size={28} className="mx-auto text-[var(--text-secondary)]" />
          <h3 className="text-[36px] leading-[42px] font-semibold text-[var(--text-primary)]">Create your first GitHub project</h3>
          <p className="text-[var(--text-secondary)] text-lg">Projects are a customizable, flexible tool for planning and tracking your work.</p>
          <button type="button" className="h-10 px-5 rounded-md bg-[var(--accent-secondary)] text-[var(--text-on-accent)] font-semibold">New project</button>
        </div>
      </section>
    </div>
  );
}

