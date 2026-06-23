import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronDown, TableProperties } from "lucide-react";
import { SpinnerPlaceholder } from "../../shared/LoadingPlaceholders";
import { QueryInput } from "../../shared/QueryInput";
import { useAuth } from "../../../contexts/AuthContext";
import { projectsApi } from "../../../services/api";
import type { Project } from "../../../types";

interface ProfileProjectsPageProps {
  isLoading?: boolean;
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 30) return `Updated ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Updated ${months} month${months > 1 ? "s" : ""} ago`;
}

export default function ProfileProjectsPage({ isLoading }: ProfileProjectsPageProps) {
  const [query, setQuery] = useState("is:open");
  const navigate = useNavigate();
  const { currentUsername } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFetchLoading(true);
    projectsApi.listProjects()
      .then((data) => {
        if (!cancelled) setProjects(data || []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setFetchLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleNewProject = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const project = await projectsApi.createProject({ title: "Untitled project" });
      // After create, fetch views for this new project to get the first view id
      const views = await projectsApi.listViews(project.id);
      const firstViewId = views?.[0]?.id ?? "1";
      navigate(`/users/${currentUsername}/projects/${project.number}/views/${firstViewId}`);
    } catch (e) {
      console.error("Failed to create project", e);
      setCreating(false);
    }
  };

  if (isLoading || fetchLoading) {
    return (
      <div className="flex justify-center py-12">
        <SpinnerPlaceholder size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] focus-within:border-[var(--focus-border,#0969da)] focus-within:ring-1 focus-within:ring-[var(--focus-border,#0969da)]">
          <QueryInput
            value={query}
            onChange={setQuery}
            containerClassName="w-full h-8"
            className="absolute inset-0 w-full h-full pl-9 pr-8 outline-none font-sans text-sm focus:ring-0 focus:outline-none"
          />
          {query && (
            <button 
              type="button" 
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] z-20"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button 
          type="button" 
          id="new-project-btn"
          onClick={handleNewProject}
          disabled={creating}
          className="shrink-0 h-8 px-3 rounded-md bg-[var(--fgColor-success,#1f883d)] text-white text-sm font-semibold hover:bg-[var(--fgColor-success-hover,#1a7f37)] disabled:opacity-60"
        >
          {creating ? "Creating..." : "New project"}
        </button>
      </div>

      {/* Main panel */}
      <div className="border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <button type="button" className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 hover:text-[var(--text-primary)]">
              Open
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--surface-badge)] px-1.5 text-xs font-semibold text-[var(--text-primary)]">{projects.length}</span>
            </button>
            <button type="button" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5">
              Closed
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--surface-badge)] px-1.5 text-xs font-medium text-[var(--text-primary)]">0</span>
            </button>
          </div>
          <button type="button" className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Sort
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Body */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-[70px] px-4 text-center">
            <TableProperties size={24} className="text-[var(--text-secondary)] mb-4" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">No open projects</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Create a new project to track issues and pull requests.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-default)]">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/users/${currentUsername}/projects/${project.number}/views/1`)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-subtle)] text-left"
                >
                  <TableProperties size={16} className="text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{project.title}</div>
                    {project.description && (
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{project.description}</div>
                    )}
                    <div className="text-xs text-[var(--text-muted)] mt-1">{formatTimeAgo(project.updated_at)}</div>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] shrink-0 mt-0.5">#{project.number}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
