import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  ChevronDown,
  Lock,
  Monitor,
} from "lucide-react";
import type {
  CreateRepositoryPayload,
  RepositoryVisibility,
} from "../../types";
import { formatVisibilityLabel } from "../../utils/visibility";
import RouteButton from "../layout/RouteButton";
import TopHeader from "../layout/TopHeader";

interface CreateRepositoryPageProps {
  ownerName: string;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onCreateRepository: (payload: CreateRepositoryPayload) => Promise<void>;
}

const GITIGNORE_OPTIONS = [
  { label: "No .gitignore", value: "none" },
  { label: "Go", value: "go" },
  { label: "Node", value: "node" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "Rust", value: "rust" },
];

const LICENSE_OPTIONS = [
  { label: "No license", value: "none" },
  { label: "MIT License", value: "mit" },
  { label: "Apache License 2.0", value: "apache-2.0" },
  { label: "GNU GPL v3.0", value: "gpl-3.0" },
];

const VISIBILITY_OPTIONS: Array<{
  value: RepositoryVisibility;
  icon: typeof Monitor;
  helper: string;
}> = [
  {
    value: "PUBLIC",
    icon: Monitor,
    helper: "Anyone on the internet can see this repository. You choose who can commit.",
  },
  {
    value: "PRIVATE",
    icon: Lock,
    helper: "You choose who can see and commit to this repository.",
  },
];

export default function CreateRepositoryPage({
  ownerName,
  submitting,
  error,
  onCancel,
  onCreateRepository,
}: CreateRepositoryPageProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<RepositoryVisibility>("PUBLIC");
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);
  const [addReadme, setAddReadme] = useState(false);
  const [gitignoreTemplate, setGitignoreTemplate] = useState("none");
  const [licenseTemplate, setLicenseTemplate] = useState("none");
  const visibilityDropdownRef = useRef<HTMLDivElement | null>(null);
  const activeVisibilityOption =
    VISIBILITY_OPTIONS.find((option) => option.value === visibility) ?? VISIBILITY_OPTIONS[0];
  const ActiveVisibilityIcon = activeVisibilityOption.icon;

  useEffect(() => {
    if (!isVisibilityOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        visibilityDropdownRef.current &&
        !visibilityDropdownRef.current.contains(event.target as Node)
      ) {
        setIsVisibilityOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVisibilityOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isVisibilityOpen]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) return;

    await onCreateRepository({
      name: trimmedName,
      description: description.trim() || undefined,
      visibility,
      initialize_readme: addReadme,
      gitignore_template: gitignoreTemplate,
      license_template: licenseTemplate,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-default)] bg-[var(--surface-page)]">
        <TopHeader
          badgeText="GH"
          leftContent={
            <RouteButton selected onClick={onCancel} className="truncate">
              New repository
            </RouteButton>
          }
          onMenuClick={onCancel}
          menuAriaLabel="Back"
          onCreateClick={onCancel}
          actions={[{ label: "Cancel", onClick: onCancel }]}
        />
      </header>

      <main className="max-w-[980px] mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="max-w-[980px] mx-auto">
          <h1 className="text-2xl font-semibold">Create a new repository</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Repositories contain a project&apos;s files and version history. Have a project elsewhere?{" "}
            <button type="button" className="text-[var(--text-link)] hover:underline">
              Import a repository.
            </button>
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Required fields are marked with an asterisk (*).</p>

          {error && (
            <div className="mt-4 rounded-md border border-[var(--text-danger)] bg-[var(--surface-danger-subtle)] px-3 py-2 text-sm text-[var(--text-danger)]">
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-[44px_minmax(0,1fr)] gap-x-4 gap-y-0">
            <aside className="hidden md:flex flex-col items-center pt-1">
              <span className="h-8 w-8 rounded-full border border-[var(--border-muted)] bg-[var(--surface-canvas)] text-sm font-semibold text-[var(--text-secondary)] inline-flex items-center justify-center">
                1
              </span>
              <span className="mt-2 w-px flex-1 bg-[var(--border-muted)]" />
            </aside>

            <section className="pb-8">
              <h2 className="text-[34px] leading-[1.2] font-semibold text-[var(--text-primary)]">General</h2>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-[170px_24px_minmax(0,1fr)] gap-2 items-end">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1">
                    Owner *
                  </label>
                  <button
                    type="button"
                    className="h-9 w-full rounded-md border border-[var(--border-input)] bg-[var(--surface-subtle)] px-3 text-sm text-left inline-flex items-center justify-between"
                  >
                    <span>{ownerName}</span>
                    <ChevronDown size={14} className="text-[var(--text-secondary)]" />
                  </button>
                </div>

                <div className="h-9 flex items-center justify-center text-[var(--text-secondary)] text-2xl">/</div>

                <div>
                  <label htmlFor="repo-name" className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1">
                    Repository name *
                  </label>
                  <input
                    id="repo-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 w-full rounded-md border border-[var(--border-input)] bg-[var(--surface-canvas)] px-3 text-sm"
                    required
                  />
                </div>
              </div>

              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Great repository names are short and memorable.
              </p>

              <div className="mt-5">
                <label htmlFor="repo-description" className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <input
                  id="repo-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--border-input)] bg-[var(--surface-canvas)] px-3 text-sm"
                />
                <p className="mt-2 text-xs text-[var(--text-secondary)]">{description.length} / 350 characters</p>
              </div>
            </section>

            <aside className="hidden md:flex flex-col items-center pt-1">
              <span className="h-8 w-8 rounded-full border border-[var(--border-muted)] bg-[var(--surface-canvas)] text-sm font-semibold text-[var(--text-secondary)] inline-flex items-center justify-center">
                2
              </span>
              <span className="mt-2 w-px flex-1 bg-[var(--border-muted)]" />
            </aside>

            <section>
              <h2 className="text-[34px] leading-[1.2] font-semibold text-[var(--text-primary)]">Configuration</h2>

              <div className="mt-4 border border-[var(--border-muted)] rounded-md overflow-visible">
                <div className="p-4 border-b border-[var(--border-muted)] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px] gap-3 items-center">
                  <div>
                    <p className="text-sm font-semibold">Choose visibility *</p>
                    <p className="text-sm text-[var(--text-secondary)]">Choose who can see and commit to this repository</p>
                  </div>

                  <div className="relative" ref={visibilityDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsVisibilityOpen((prev) => !prev)}
                      className="h-9 w-full rounded-md border border-[var(--border-input)] bg-[var(--surface-subtle)] px-3 text-sm inline-flex items-center justify-between"
                    >
                      <span className="inline-flex items-center gap-2 font-medium text-[var(--text-primary)]">
                        <ActiveVisibilityIcon size={15} />
                        {formatVisibilityLabel(visibility)}
                      </span>
                      <ChevronDown size={14} className="text-[var(--text-secondary)]" />
                    </button>

                    {isVisibilityOpen && (
                      <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[360px] rounded-xl border border-[var(--border-muted)] bg-[var(--surface-canvas)] shadow-xl overflow-hidden">
                        {VISIBILITY_OPTIONS.map((option, index) => {
                          const OptionIcon = option.icon;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setVisibility(option.value);
                                setIsVisibilityOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-[var(--surface-subtle)] flex items-start gap-3 ${index > 0 ? "border-t border-[var(--border-muted)]" : ""}`}
                            >
                              <span className="w-4 mt-0.5 text-[var(--text-secondary)]">
                                {visibility === option.value ? <Check size={15} /> : null}
                              </span>
                              <OptionIcon size={16} className="mt-0.5 text-[var(--text-secondary)] shrink-0" />
                              <span>
                                <span className="block text-[22px] leading-[1.2] font-semibold text-[var(--text-primary)]">
                                  {formatVisibilityLabel(option.value)}
                                </span>
                                <span className="block mt-1 text-sm text-[var(--text-secondary)] leading-5">
                                  {option.helper}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-b border-[var(--border-muted)] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px] gap-3 items-center">
                  <div>
                    <p className="text-sm font-semibold">Add README</p>
                    <p className="text-sm text-[var(--text-secondary)]">READMEs can be used as longer descriptions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddReadme((prev) => !prev)}
                    className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--surface-subtle)] px-3 inline-flex items-center justify-between text-sm text-[var(--text-secondary)]"
                  >
                    <span>{addReadme ? "On" : "Off"}</span>
                    <span className={`ml-3 relative inline-flex h-5 w-9 items-center rounded-full ${addReadme ? "bg-[var(--accent-primary)]" : "bg-[var(--border-input)]"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-[var(--surface-canvas)] transition ${addReadme ? "translate-x-4" : "translate-x-0.5"}`} />
                    </span>
                  </button>
                </div>

                <div className="p-4 border-b border-[var(--border-muted)] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-3 items-center">
                  <div>
                    <p className="text-sm font-semibold">Add .gitignore</p>
                    <p className="text-sm text-[var(--text-secondary)]">.gitignore tells git which files not to track.</p>
                  </div>
                  <select
                    value={gitignoreTemplate}
                    onChange={(e) => setGitignoreTemplate(e.target.value)}
                    className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--surface-subtle)] px-3 text-sm"
                  >
                    {GITIGNORE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-3 items-center">
                  <div>
                    <p className="text-sm font-semibold">Add license</p>
                    <p className="text-sm text-[var(--text-secondary)]">Licenses explain how others can use your code.</p>
                  </div>
                  <select
                    value={licenseTemplate}
                    onChange={(e) => setLicenseTemplate(e.target.value)}
                    className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--surface-subtle)] px-3 text-sm"
                  >
                    {LICENSE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 rounded-md border border-[var(--border-input)] bg-[var(--surface-canvas)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="h-9 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create repository"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

