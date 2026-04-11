import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Github,
  Lock,
  Menu,
  Monitor,
  Plus,
  Search,
} from "lucide-react";
import type {
  CreateRepositoryPayload,
  RepositoryVisibility,
} from "../../types";

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

export default function CreateRepositoryPage({
  ownerName,
  submitting,
  error,
  onCancel,
  onCreateRepository,
}: CreateRepositoryPageProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<RepositoryVisibility>("public");
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);
  const [addReadme, setAddReadme] = useState(false);
  const [gitignoreTemplate, setGitignoreTemplate] = useState("none");
  const [licenseTemplate, setLicenseTemplate] = useState("none");
  const visibilityDropdownRef = useRef<HTMLDivElement | null>(null);

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
    <div className="min-h-screen bg-white text-[#24292f]">
      <header className="h-14 border-b border-[#d8dee4] bg-white px-4 lg:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 w-8 rounded-md border border-[#d0d7de] bg-white inline-flex items-center justify-center hover:bg-[#f6f8fa]"
            aria-label="Back"
          >
            <Menu size={16} />
          </button>
          <Github size={20} className="text-[#24292f]" />
          <span className="text-sm font-semibold truncate">New repository</span>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-1 max-w-[360px]">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c959f]" />
            <input
              readOnly
              value="Type / to search"
              className="h-8 w-full rounded-md border border-[#d0d7de] bg-white pl-9 pr-3 text-sm text-[#57606a]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-8 w-8 rounded-md border border-[#d0d7de] bg-white inline-flex items-center justify-center hover:bg-[#f6f8fa]"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            className="h-8 w-8 rounded-md border border-[#d0d7de] bg-white inline-flex items-center justify-center hover:bg-[#f6f8fa]"
          >
            <Bell size={14} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 rounded-md border border-[#d0d7de] bg-white text-xs font-semibold hover:bg-[#f6f8fa]"
          >
            Cancel
          </button>
        </div>
      </header>

      <main className="max-w-[980px] mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="max-w-[980px] mx-auto">
          <h1 className="text-2xl font-semibold">Create a new repository</h1>
          <p className="mt-1 text-sm text-[#57606a]">
            Repositories contain a project&apos;s files and version history. Have a project elsewhere?{" "}
            <button type="button" className="text-[#0969da] hover:underline">
              Import a repository.
            </button>
          </p>
          <p className="mt-1 text-xs text-[#57606a]">Required fields are marked with an asterisk (*).</p>

          {error && (
            <div className="mt-4 rounded-md border border-[#cf222e] bg-[#ffebe9] px-3 py-2 text-sm text-[#cf222e]">
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-[44px_minmax(0,1fr)] gap-x-4 gap-y-0">
            <aside className="hidden md:flex flex-col items-center pt-1">
              <span className="h-8 w-8 rounded-full border border-[#d8dee4] bg-white text-sm font-semibold text-[#57606a] inline-flex items-center justify-center">
                1
              </span>
              <span className="mt-2 w-px flex-1 bg-[#d8dee4]" />
            </aside>

            <section className="pb-8">
              <h2 className="text-[34px] leading-[1.2] font-semibold text-[#24292f]">General</h2>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-[170px_24px_minmax(0,1fr)] gap-2 items-end">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#57606a] mb-1">
                    Owner *
                  </label>
                  <button
                    type="button"
                    className="h-9 w-full rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm text-left inline-flex items-center justify-between"
                  >
                    <span>{ownerName}</span>
                    <ChevronDown size={14} className="text-[#57606a]" />
                  </button>
                </div>

                <div className="h-9 flex items-center justify-center text-[#57606a] text-2xl">/</div>

                <div>
                  <label htmlFor="repo-name" className="block text-xs font-semibold uppercase tracking-wide text-[#57606a] mb-1">
                    Repository name *
                  </label>
                  <input
                    id="repo-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 w-full rounded-md border border-[#d0d7de] bg-white px-3 text-sm"
                    required
                  />
                </div>
              </div>

              <p className="mt-3 text-sm text-[#57606a]">
                Great repository names are short and memorable.
              </p>

              <div className="mt-5">
                <label htmlFor="repo-description" className="block text-xs font-semibold uppercase tracking-wide text-[#57606a] mb-1">
                  Description
                </label>
                <input
                  id="repo-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-9 w-full rounded-md border border-[#d0d7de] bg-white px-3 text-sm"
                />
                <p className="mt-2 text-xs text-[#57606a]">{description.length} / 350 characters</p>
              </div>
            </section>

            <aside className="hidden md:flex flex-col items-center pt-1">
              <span className="h-8 w-8 rounded-full border border-[#d8dee4] bg-white text-sm font-semibold text-[#57606a] inline-flex items-center justify-center">
                2
              </span>
              <span className="mt-2 w-px flex-1 bg-[#d8dee4]" />
            </aside>

            <section>
              <h2 className="text-[34px] leading-[1.2] font-semibold text-[#24292f]">Configuration</h2>

              <div className="mt-4 border border-[#d8dee4] rounded-md overflow-visible">
                <div className="p-4 border-b border-[#d8dee4] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px] gap-3 items-center">
                  <div>
                    <p className="text-sm font-semibold">Choose visibility *</p>
                    <p className="text-sm text-[#57606a]">Choose who can see and commit to this repository</p>
                  </div>

                  <div className="relative" ref={visibilityDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsVisibilityOpen((prev) => !prev)}
                      className="h-9 w-full rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm inline-flex items-center justify-between"
                    >
                      <span className="inline-flex items-center gap-2 font-medium text-[#24292f]">
                        {visibility === "public" ? <Monitor size={15} /> : <Lock size={15} />}
                        {visibility === "public" ? "Public" : "Private"}
                      </span>
                      <ChevronDown size={14} className="text-[#57606a]" />
                    </button>

                    {isVisibilityOpen && (
                      <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[360px] rounded-xl border border-[#d8dee4] bg-white shadow-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setVisibility("public");
                            setIsVisibilityOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-[#f6f8fa] flex items-start gap-3"
                        >
                          <span className="w-4 mt-0.5 text-[#57606a]">
                            {visibility === "public" ? <Check size={15} /> : null}
                          </span>
                          <Monitor size={16} className="mt-0.5 text-[#57606a] shrink-0" />
                          <span>
                            <span className="block text-[22px] leading-[1.2] font-semibold text-[#24292f]">Public</span>
                            <span className="block mt-1 text-sm text-[#57606a] leading-5">
                              Anyone on the internet can see this repository. You choose who can commit.
                            </span>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setVisibility("private");
                            setIsVisibilityOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-[#f6f8fa] border-t border-[#d8dee4] flex items-start gap-3"
                        >
                          <span className="w-4 mt-0.5 text-[#57606a]">
                            {visibility === "private" ? <Check size={15} /> : null}
                          </span>
                          <Lock size={16} className="mt-0.5 text-[#57606a] shrink-0" />
                          <span>
                            <span className="block text-[22px] leading-[1.2] font-semibold text-[#24292f]">Private</span>
                            <span className="block mt-1 text-sm text-[#57606a] leading-5">
                              You choose who can see and commit to this repository.
                            </span>
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-b border-[#d8dee4] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px] gap-3 items-center">
                  <div>
                    <p className="text-sm font-semibold">Add README</p>
                    <p className="text-sm text-[#57606a]">READMEs can be used as longer descriptions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddReadme((prev) => !prev)}
                    className="h-9 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 inline-flex items-center justify-between text-sm text-[#57606a]"
                  >
                    <span>{addReadme ? "On" : "Off"}</span>
                    <span className={`ml-3 relative inline-flex h-5 w-9 items-center rounded-full ${addReadme ? "bg-[#2da44e]" : "bg-[#d0d7de]"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${addReadme ? "translate-x-4" : "translate-x-0.5"}`} />
                    </span>
                  </button>
                </div>

                <div className="p-4 border-b border-[#d8dee4] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-3 items-center">
                  <div>
                    <p className="text-sm font-semibold">Add .gitignore</p>
                    <p className="text-sm text-[#57606a]">.gitignore tells git which files not to track.</p>
                  </div>
                  <select
                    value={gitignoreTemplate}
                    onChange={(e) => setGitignoreTemplate(e.target.value)}
                    className="h-9 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm"
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
                    <p className="text-sm text-[#57606a]">Licenses explain how others can use your code.</p>
                  </div>
                  <select
                    value={licenseTemplate}
                    onChange={(e) => setLicenseTemplate(e.target.value)}
                    className="h-9 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm"
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
              className="h-9 px-4 rounded-md border border-[#d0d7de] bg-white text-sm font-medium text-[#24292f] hover:bg-[#f6f8fa]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="h-9 px-4 rounded-md bg-[#2da44e] text-white text-sm font-semibold hover:bg-[#2c974b] disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create repository"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
