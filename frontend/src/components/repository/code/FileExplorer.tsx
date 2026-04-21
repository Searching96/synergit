import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Code,
  ChevronDown,
  ChevronRight,
  Copy,
  Ellipsis,
  FileText,
  GitBranch,
  Link,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import {
  BookIcon,
  EyeIcon,
  FileDirectoryFillIcon,
  FileIcon,
  HistoryIcon,
  PulseIcon,
  RepoForkedIcon,
  StarIcon,
} from "@primer/octicons-react";
import ReactMarkdown from "react-markdown";
import type { Branch, Commit, LanguageBreakdownStat, RepoFile } from "../../../types";
import { reposApi } from "../../../services/api";
import BranchTagMenu from "./BranchTagMenu";
import { applyStandardEditorShortcuts } from "./utils/editorShortcuts";
import { useLatestCommitMap } from "./hooks/useLatestCommitMap";

type ExplorerLocation = {
  type: "root" | "file" | "dir";
  path?: string;
};

interface FileExplorerProps {
  repoId: string;
  repoName: string;
  repoDescription?: string;
  repoOwner?: string;
  repoStars?: number;
  repoForks?: number;
  repoWatchers?: number;
  cloneUrl?: string;
  initialLocation?: ExplorerLocation;
  onNavigateLocation?: (location: ExplorerLocation) => void;
  branch: string;
  branches: Branch[];
  onSelectBranch: (branchName: string) => void;
  onOpenCommitHistory?: (branchName: string) => void;
  onOpenCreateFile?: (branchName: string, directoryPath: string) => void;
  onOpenUploadFiles?: (branchName: string, directoryPath: string) => void;
}

function sortEntries(entries: RepoFile[]): RepoFile[] {
  return [...entries].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "DIR" ? -1 : 1;
  });
}

function getParentPath(path: string): string {
  if (!path) return "";
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function commitMessagePlaceholder(item: RepoFile): string {
  return item.type === "DIR" ? "Updated folder structure" : "Updated file";
}

function shortCommitHash(hash: string): string {
  return hash.trim().slice(0, 7);
}

function formatRelativeCommitTime(dateValue: string): string {
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) {
    return "just now";
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) {
    return "just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) {
    return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
  }

  const elapsedMonths = Math.floor(elapsedDays / 30);
  if (elapsedMonths < 12) {
    return `${elapsedMonths} month${elapsedMonths === 1 ? "" : "s"} ago`;
  }

  const elapsedYears = Math.floor(elapsedMonths / 12);
  return `${elapsedYears} year${elapsedYears === 1 ? "" : "s"} ago`;
}

function extractAboutTextFromReadme(readme: string | null): string | null {
  if (!readme) {
    return null;
  }

  const lines = readme.split(/\r?\n/);
  const chunks: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!collecting) {
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      collecting = true;
      chunks.push(trimmed);
      continue;
    }

    if (!trimmed || trimmed.startsWith("#")) {
      break;
    }

    chunks.push(trimmed);
  }

  if (chunks.length === 0) {
    return null;
  }

  return chunks.join(" ");
}

function normalizeReadmeMarkdown(readme: string | null, repoName: string): string | null {
  if (!readme) {
    return null;
  }

  const lines = readme.split(/\r?\n/);
  const firstNonEmptyLineIndex = lines.findIndex((line) => line.trim().length > 0);

  if (firstNonEmptyLineIndex === -1) {
    return `# ${repoName}`;
  }

  const firstLine = lines[firstNonEmptyLineIndex].trim();
  if (firstLine.startsWith("#")) {
    return readme;
  }

  if (firstLine.toLowerCase() === repoName.trim().toLowerCase()) {
    lines[firstNonEmptyLineIndex] = `# ${firstLine}`;
    return lines.join("\n");
  }

  return `# ${repoName}\n\n${readme}`;
}

const LANGUAGE_GRAPH_FALLBACK_COLORS = [
  "#b07219",
  "#3178c6",
  "#f1e05a",
  "#00add8",
  "#3572a5",
  "#178600",
  "#f34b7d",
  "#563d7c",
];

const LANGUAGE_GRAPH_OVERRIDES: Record<string, string> = {
  Assembly: "#6e4c13",
  Batchfile: "#c1f12e",
  C: "#555555",
  "C#": "#178600",
  "C++": "#f34b7d",
  CSS: "#563d7c",
  Dockerfile: "#384d54",
  GDScript: "#355570",
  Go: "#00add8",
  HTML: "#e34c26",
  Haskell: "#5e5086",
  Java: "#b07219",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Rust: "#dea584",
  Shell: "#89e051",
  TypeScript: "#3178c6",
};

function languageGraphColor(language: string, index: number): string {
  const normalized = language.trim();
  return LANGUAGE_GRAPH_OVERRIDES[normalized] || LANGUAGE_GRAPH_FALLBACK_COLORS[index % LANGUAGE_GRAPH_FALLBACK_COLORS.length];
}


export default function FileExplorer({
  repoId,
  repoName,
  repoDescription,
  repoOwner,
  repoStars,
  repoForks,
  repoWatchers,
  cloneUrl: backendCloneUrl,
  onNavigateLocation,
  branch,
  branches,
  onSelectBranch,
  onOpenCommitHistory,
  onOpenCreateFile,
  onOpenUploadFiles,
}: FileExplorerProps) {
  const [entriesByPath, setEntriesByPath] = useState<Record<string, RepoFile[]>>({});
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));

  const [currentDirPath, setCurrentDirPath] = useState<string>("");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);

  const [rootLoading, setRootLoading] = useState<boolean>(true);
  const [dirLoading, setDirLoading] = useState<boolean>(false);
  const [fileLoading] = useState<boolean>(false);
  const [readmeLoading, setReadmeLoading] = useState<boolean>(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [isEditingReadme, setIsEditingReadme] = useState<boolean>(false);
  const [readmeDraft, setReadmeDraft] = useState<string>("");
  const [readmeCommitMessage, setReadmeCommitMessage] = useState<string>("Update README");
  const [isCommittingReadme, setIsCommittingReadme] = useState<boolean>(false);
  const [readmeEditError, setReadmeEditError] = useState<string | null>(null);
  const [languageBreakdown, setLanguageBreakdown] = useState<LanguageBreakdownStat[]>([]);
  const [languageBreakdownLoading, setLanguageBreakdownLoading] = useState<boolean>(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [recentCommits, setRecentCommits] = useState<Commit[]>([]);
  const [commitsLoading, setCommitsLoading] = useState<boolean>(false);
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState<boolean>(false);
  const [isCodeMenuOpen, setIsCodeMenuOpen] = useState<boolean>(false);
  const [isAddFileMenuOpen, setIsAddFileMenuOpen] = useState<boolean>(false);
  const [isBranchesPageOpen, setIsBranchesPageOpen] = useState<boolean>(false);

  const rootEntries = useMemo(() => sortEntries(entriesByPath[""] || []), [entriesByPath]);
  const currentEntries = useMemo(
    () => sortEntries(entriesByPath[currentDirPath] || []),
    [entriesByPath, currentDirPath],
  );
  const readmeEntry = useMemo(
    () => rootEntries.find((entry) => entry.type === "FILE" && entry.name.toLowerCase() === "readme.md") || null,
    [rootEntries],
  );
  const displayedEntries = useMemo(
    () => [...rootEntries, ...currentEntries],
    [currentEntries, rootEntries],
  );
  const latestCommitByPath = useLatestCommitMap(
    repoId,
    branch,
    displayedEntries.map((item) => item.path),
  );
  const getItemCommitDetails = useCallback((item: RepoFile) => {
    const itemCommit = latestCommitByPath[item.path] || null;

    return {
      message: itemCommit?.message?.trim() || commitMessagePlaceholder(item),
      when: itemCommit ? formatRelativeCommitTime(itemCommit.date) : "-",
    };
  }, [latestCommitByPath]);

  const isRootMode = true;
  const cloneUrl = useMemo(() => {
    if (backendCloneUrl && backendCloneUrl.trim()) {
      return backendCloneUrl.trim();
    }

    const owner = (repoOwner || "owner").trim();
    const explicitCloneBase = (import.meta.env.VITE_CLONE_BASE_URL as string | undefined)?.trim();
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

    if (explicitCloneBase) {
      return `${explicitCloneBase.replace(/\/$/, "")}/${owner}/${repoName}.git`;
    }

    if (apiBase) {
      const normalizedApiBase = apiBase.replace(/\/$/, "");
      const apiOrigin = normalizedApiBase.replace(/\/api\/v\d+$/, "");
      return `${apiOrigin}/${owner}/${repoName}.git`;
    }

    return `http://localhost:8080/${owner}/${repoName}.git`;
  }, [backendCloneUrl, repoOwner, repoName]);
  const quickSetupCreateCommands = useMemo(
    () =>
      [
        `echo "# ${repoName}" >> README.md`,
        "git init",
        "git add README.md",
        'git commit -m "Initial commit"',
        "git branch -M main",
        `git remote add origin ${cloneUrl}`,
        "git push -u origin main",
      ].join("\n"),
    [repoName, cloneUrl],
  );
  const quickSetupPushCommands = useMemo(
    () =>
      [
        `git remote add origin ${cloneUrl}`,
        "git branch -M main",
        "git push -u origin main",
      ].join("\n"),
    [cloneUrl],
  );
  const defaultBranch = branches.find((item) => item.is_default) || branches[0] || null;
  const activeBranchForAddFile = (branch || defaultBranch?.name || "master").trim() || "master";
  const displayedBranchLabel = (branch || defaultBranch?.name || "master").trim() || "master";
  const nonDefaultBranches = defaultBranch
    ? branches.filter((item) => item.name !== defaultBranch.name)
    : branches;
  const yourBranches = nonDefaultBranches.slice(0, 1);
  const activeBranches = nonDefaultBranches.slice(1);

  const loadDir = useCallback(
    async (path: string, isRoot: boolean) => {
      try {
        setLoadError(null);
        if (isRoot) {
          setRootLoading(true);
        } else {
          setDirLoading(true);
        }

        const data = await reposApi.getTree(repoId, path, branch);
        setEntriesByPath((prev) => ({ ...prev, [path]: data || [] }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load directory";
        setLoadError(message);
      } finally {
        if (isRoot) {
          setRootLoading(false);
        } else {
          setDirLoading(false);
        }
      }
    },
    [repoId, branch],
  );

  useEffect(() => {
    setEntriesByPath({});
    setExpandedDirs(new Set([""]));
    setCurrentDirPath("");
    setSelectedFilePath(null);
    setFileContent(null);
    setReadmeContent(null);
    setLoadError(null);
    setIsEditing(false);
    setDraftContent("");
    setCommitMessage("");
    setCommitError(null);
    setIsEditingReadme(false);
    setReadmeDraft("");
    setReadmeCommitMessage("Update README");
    setReadmeEditError(null);
    setLanguageBreakdown([]);
    setLanguageBreakdownLoading(false);
    setRecentCommits([]);
    setCommitsLoading(false);
    setIsAddFileMenuOpen(false);
    setIsBranchMenuOpen(false);
    setIsCodeMenuOpen(false);
    setIsBranchesPageOpen(false);
    void loadDir("", true);
  }, [repoId, branch, loadDir]);

  useEffect(() => {
    if (!readmeEntry) {
      setReadmeContent(null);
      setReadmeLoading(false);
      return;
    }

    let active = true;
    setReadmeLoading(true);

    reposApi
      .getBlob(repoId, readmeEntry.path, branch)
      .then((data) => {
        if (!active) return;
        const content = typeof data === "string" ? data : data.content;
        setReadmeContent(content);
      })
      .catch(() => {
        if (!active) return;
        setReadmeContent(null);
      })
      .finally(() => {
        if (!active) return;
        setReadmeLoading(false);
      });

    return () => {
      active = false;
    };
  }, [readmeEntry, repoId, branch]);

  useEffect(() => {
    let active = true;
    setLanguageBreakdownLoading(true);

    reposApi
      .getInsights(repoId)
      .then((snapshot) => {
        if (!active) return;

        const normalized = [...(snapshot.language_breakdown || [])]
          .filter((item) => item && item.language && item.percentage > 0)
          .sort((a, b) => b.percentage - a.percentage);

        setLanguageBreakdown(normalized);
      })
      .catch(() => {
        if (!active) return;
        setLanguageBreakdown([]);
      })
      .finally(() => {
        if (!active) return;
        setLanguageBreakdownLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repoId]);

  useEffect(() => {
    let active = true;
    setCommitsLoading(true);

    reposApi
      .getCommits(repoId, branch)
      .then((data) => {
        if (!active) return;
        setRecentCommits(data || []);
      })
      .catch(() => {
        if (!active) return;
        setRecentCommits([]);
      })
      .finally(() => {
        if (!active) return;
        setCommitsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repoId, branch]);

  const normalizedReadmeContent = useMemo(
    () => normalizeReadmeMarkdown(readmeContent, repoName),
    [readmeContent, repoName],
  );

  const fallbackAboutText = "No description, website, or topics provided.";
  const derivedReadmeAboutText = useMemo(
    () => extractAboutTextFromReadme(normalizedReadmeContent),
    [normalizedReadmeContent],
  );
  const aboutText = (repoDescription || "").trim() || derivedReadmeAboutText || fallbackAboutText;
  const displayedLanguageBreakdown = useMemo(
    () => languageBreakdown.slice(0, 6),
    [languageBreakdown],
  );
  const latestCommit = recentCommits[0] || null;
  const commitCountLabel = `${recentCommits.length.toLocaleString()} Commit${recentCommits.length === 1 ? "" : "s"}`;
  const starCount = typeof repoStars === "number" ? repoStars : 0;
  const watchingCount = typeof repoWatchers === "number" ? repoWatchers : 0;
  const forkCount = typeof repoForks === "number" ? repoForks : 0;

  const expandPathAncestors = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      next.add("");
      if (!path) return next;

      const segments = path.split("/").filter(Boolean);
      let cursor = "";
      for (const segment of segments) {
        cursor = cursor ? `${cursor}/${segment}` : segment;
        next.add(cursor);
      }

      return next;
    });
  };

  const notifyLocation = useCallback((location: ExplorerLocation) => {
    onNavigateLocation?.(location);
  }, [onNavigateLocation]);

  const openRoot = useCallback((syncLocation: boolean = true) => {
    setCurrentDirPath("");
    setSelectedFilePath(null);
    setFileContent(null);
    setCommitError(null);
    setIsEditing(false);
    setIsBranchesPageOpen(false);
    expandPathAncestors("");

    if (syncLocation) {
      notifyLocation({ type: "root", path: "" });
    }
  }, [notifyLocation]);

  const openDirectory = useCallback((path: string, syncLocation: boolean = true) => {
    if (path === "") {
      openRoot(syncLocation);
      return;
    }

    setIsBranchesPageOpen(false);

    if (syncLocation) {
      notifyLocation({ type: "dir", path });
    }
  }, [notifyLocation, openRoot]);

  const openFile = useCallback((path: string, syncLocation: boolean = true) => {
    setIsBranchesPageOpen(false);

    if (syncLocation) {
      notifyLocation({ type: "file", path });
    }
  }, [notifyLocation]);

  const toggleExpand = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });

    if (!entriesByPath[path]) {
      void loadDir(path, false);
    }
  };

  const handleCommitChanges = async () => {
    if (!selectedFilePath || !commitMessage.trim()) return;

    try {
      setIsCommitting(true);
      setCommitError(null);

      await reposApi.commitFileChange(repoId, {
        branch,
        path: selectedFilePath,
        content: draftContent,
        commit_message: commitMessage.trim(),
      });

      setFileContent(draftContent);
      setIsEditing(false);
      setCommitMessage("");
    } catch (err: unknown) {
      setCommitError(err instanceof Error ? err.message : "Failed to commit changes");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCommitReadmeChanges = async () => {
    if (!readmeEntry || !readmeCommitMessage.trim()) return;

    try {
      setIsCommittingReadme(true);
      setReadmeEditError(null);

      await reposApi.commitFileChange(repoId, {
        branch,
        path: readmeEntry.path,
        content: readmeDraft,
        commit_message: readmeCommitMessage.trim(),
      });

      setReadmeContent(readmeDraft);
      setIsEditingReadme(false);
      setReadmeCommitMessage("Update README");
    } catch (err: unknown) {
      setReadmeEditError(err instanceof Error ? err.message : "Failed to commit README changes");
    } finally {
      setIsCommittingReadme(false);
    }
  };

  const handleCodeTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    applyStandardEditorShortcuts(e, setDraftContent);
  };

  const handleReadmeTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    applyStandardEditorShortcuts(e, setReadmeDraft);
  };

  const renderTree = (path: string, depth: number = 0): ReactElement[] => {
    const entries = sortEntries(entriesByPath[path] || []);
    const nodes: ReactElement[] = [];

    for (const item of entries) {
      const isDir = item.type === "DIR";
      const isExpanded = isDir && expandedDirs.has(item.path);
      const isActiveFile = !isDir && selectedFilePath === item.path;
      const isActiveDir = isDir && currentDirPath === item.path;

      nodes.push(
        <li key={item.path}>
          <div
            className={`w-full flex items-center gap-1 py-1 pr-2 text-sm ${
              isActiveFile || isActiveDir ? "bg-[var(--surface-info-subtle)] text-[var(--text-link)]" : "text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            }`}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            {isDir ? (
              <button
                type="button"
                onClick={() => toggleExpand(item.path)}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-[var(--surface-badge)]"
                aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-[var(--text-secondary)]" />
                ) : (
                  <ChevronRight size={14} className="text-[var(--text-secondary)]" />
                )}
              </button>
            ) : (
              <span className="h-5 w-5" />
            )}

            <button
              type="button"
              onClick={() => (isDir ? openDirectory(item.path) : openFile(item.path))}
              className="min-w-0 flex items-center gap-2 py-0.5 text-left"
            >
              {isDir ? (
                <FileDirectoryFillIcon size={16} className="text-[#54aeff] shrink-0" />
              ) : (
                <FileIcon size={16} className="text-[var(--text-secondary)] shrink-0" />
              )}
              <span className="truncate">{item.name}</span>
            </button>
          </div>
        </li>,
      );

      if (isDir && isExpanded) {
        nodes.push(...renderTree(item.path, depth + 1));
      }
    }

    return nodes;
  };

  return (
    <div className="h-full min-h-0">
      {loadError && (
        <div className="mb-3 p-3 text-sm border border-[var(--border-danger-soft)] bg-[var(--surface-danger-subtle)] text-[var(--text-danger)] rounded-md">
          {loadError}
        </div>
      )}

      {isRootMode ? (
        isBranchesPageOpen ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[40px] leading-[48px] font-normal text-[var(--text-primary)]">Branches</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsBranchesPageOpen(false)}
                  className="h-8 px-3 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-code)]"
                >
                  Back to code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBranchesPageOpen(false);
                    setIsBranchMenuOpen(true);
                  }}
                  className="h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium hover:bg-[var(--accent-primary-hover)]"
                >
                  New branch
                </button>
              </div>
            </div>

            <div className="border-b border-[var(--border-default)] flex items-end gap-2 text-sm text-[var(--text-secondary)]">
              {["Overview", "Yours", "Active", "Stale", "All"].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={`h-10 px-3 rounded-t-md ${
                    index === 0
                      ? "bg-[var(--surface-subtle)] border border-[var(--border-default)] border-b-transparent text-[var(--text-primary)]"
                      : "hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                readOnly
                placeholder="Search branches..."
                className="w-full h-9 pl-9 pr-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-secondary)]"
              />
            </div>

            <div className="space-y-6">
              {[
                { title: "Default", rows: defaultBranch ? [defaultBranch] : [] },
                { title: "Your branches", rows: yourBranches },
                { title: "Active branches", rows: activeBranches },
              ].map((section) => (
                <section key={section.title} className="space-y-2">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)]">{section.title}</h3>

                  <div className="border border-[var(--border-default)] rounded-md overflow-hidden bg-[var(--surface-canvas)]">
                    <div className="px-4 py-3 border-b border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide grid grid-cols-[minmax(220px,1.7fr)_180px_140px_70px_70px_140px_100px] gap-4">
                      <span>Branch</span>
                      <span>Updated</span>
                      <span>Check status</span>
                      <span>Behind</span>
                      <span>Ahead</span>
                      <span>Pull request</span>
                      <span></span>
                    </div>

                    {section.rows.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-[var(--text-secondary)]">No branches in this section.</div>
                    ) : (
                      <ul>
                        {section.rows.map((item) => (
                          <li
                            key={`${section.title}-${item.name}`}
                            className="px-4 py-3 border-t border-[var(--border-muted)] first:border-t-0 grid grid-cols-[minmax(220px,1.7fr)_180px_140px_70px_70px_140px_100px] gap-4 items-center text-sm"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-[var(--surface-info-subtle)] text-[var(--text-link)] px-2 py-0.5 text-xs font-semibold">
                                {item.name}
                              </span>
                              <button type="button" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Copy branch name">
                                <Copy size={14} />
                              </button>
                            </div>
                            <span className="text-[var(--text-secondary)]">just now</span>
                            <span className="text-[var(--text-muted)]">-</span>
                            <span className="text-[var(--text-secondary)]">0</span>
                            <span className="text-[var(--text-secondary)]">0</span>
                            <span className="text-[var(--text-muted)]">-</span>
                            <div className="flex items-center justify-end gap-2 text-[var(--text-secondary)]">
                              <button type="button" className="hover:text-[var(--text-primary)]" aria-label="Delete branch">
                                <Trash2 size={14} />
                              </button>
                              <button type="button" className="hover:text-[var(--text-primary)]" aria-label="More branch actions">
                                <Ellipsis size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : rootLoading ? (
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-6 text-sm text-[var(--text-secondary)]">
            Loading repository files...
          </div>
        ) : rootEntries.length === 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-4">
                <FileText size={16} className="text-[var(--text-secondary)]" />
                <h3 className="mt-3 text-[22px] font-semibold text-[var(--text-primary)]">Start coding with Codespaces</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-6">
                  Add a README file and start coding in a secure, configurable, and dedicated development environment.
                </p>
                <button
                  type="button"
                  className="mt-3 h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                >
                  Create a codespace
                </button>
              </div>

              <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-4">
                <Plus size={16} className="text-[var(--text-secondary)]" />
                <h3 className="mt-3 text-[22px] font-semibold text-[var(--text-primary)]">Add collaborators to this repository</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-6">
                  Search for people using their GitHub username or email address.
                </p>
                <button
                  type="button"
                  className="mt-3 h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                >
                  Invite collaborators
                </button>
              </div>
            </div>

            <div className="rounded-md border border-[var(--border-default)] overflow-hidden bg-[var(--surface-canvas)]">
              <div className="px-4 py-4 bg-[var(--surface-info-subtle)] border-b border-[var(--border-default)]">
                <h3 className="text-[30px] leading-[1.2] font-semibold text-[var(--text-primary)]">
                  Quick setup - if you&apos;ve done this kind of thing before
                </h3>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                  >
                    Set up in Desktop
                  </button>
                  <p>or</p>
                  <button
                    type="button"
                    className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs font-semibold text-[var(--text-primary)]"
                  >
                    HTTPS
                  </button>
                  <button
                    type="button"
                    className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs text-[var(--text-secondary)]"
                  >
                    SSH
                  </button>
                  <div className="min-w-[260px] flex-1 flex items-center gap-2">
                    <input
                      readOnly
                      value={cloneUrl}
                      className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-xs text-[var(--text-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(cloneUrl)}
                      className="h-8 w-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center"
                      aria-label="Copy quick setup URL"
                    >
                      <Copy size={14} className="text-[var(--text-secondary)]" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm text-[var(--text-secondary)] leading-6">
                  Get started by creating a new file or uploading an existing file. We recommend every repository include a README, LICENSE, and .gitignore.
                </p>
              </div>

              <div className="px-4 py-4 border-b border-[var(--border-default)]">
                <h4 className="text-[32px] leading-[1.2] font-semibold text-[var(--text-primary)]">
                  ...or create a new repository on the command line
                </h4>
                <pre className="mt-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-primary)] font-mono whitespace-pre-wrap">
                  {quickSetupCreateCommands}
                </pre>
              </div>

              <div className="px-4 py-4">
                <h4 className="text-[32px] leading-[1.2] font-semibold text-[var(--text-primary)]">
                  ...or push an existing repository from the command line
                </h4>
                <pre className="mt-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-primary)] font-mono whitespace-pre-wrap">
                  {quickSetupPushCommands}
                </pre>
              </div>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <section className="space-y-4 min-w-0">
            <div className="relative flex flex-wrap items-center gap-2">
              {(isBranchMenuOpen || isCodeMenuOpen || isAddFileMenuOpen) && (
                <button
                  type="button"
                  aria-label="Close dropdown"
                  onClick={() => {
                    setIsBranchMenuOpen(false);
                    setIsCodeMenuOpen(false);
                    setIsAddFileMenuOpen(false);
                  }}
                  className="fixed inset-0 z-10"
                />
              )}

              <div className="relative z-20">
                <BranchTagMenu
                  branches={branches}
                  currentBranch={branch}
                  isOpen={isBranchMenuOpen}
                  onOpenChange={(open) => {
                    setIsBranchMenuOpen(open);
                    if (open) {
                      setIsCodeMenuOpen(false);
                      setIsAddFileMenuOpen(false);
                    }
                  }}
                  onSelectBranch={(nextBranch) => {
                    onSelectBranch(nextBranch);
                    setIsBranchMenuOpen(false);
                  }}
                  onViewAllBranches={() => {
                    setIsBranchesPageOpen(true);
                    setIsCodeMenuOpen(false);
                    setIsAddFileMenuOpen(false);
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsBranchesPageOpen(true);
                  setIsBranchMenuOpen(false);
                  setIsCodeMenuOpen(false);
                  setIsAddFileMenuOpen(false);
                }}
                className="h-9 px-3 rounded-md bg-transparent text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-code)] inline-flex items-center gap-2"
              >
                <GitBranch size={14} />
                {branches.length} Branches
              </button>

              <button
                type="button"
                className="h-9 px-3 rounded-md bg-transparent text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-code)] inline-flex items-center gap-2"
              >
                <Tag size={14} />
                0 Tags
              </button>

              <div className="ml-auto flex items-center gap-2 min-w-[340px] max-w-full">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    readOnly
                    placeholder="Go to file"
                    className="w-full h-9 pl-9 pr-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-secondary)]"
                  />
                </div>

                <div className="relative z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddFileMenuOpen((prev) => !prev);
                      setIsCodeMenuOpen(false);
                      setIsBranchMenuOpen(false);
                    }}
                    className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-medium text-[var(--text-primary)] inline-flex items-center gap-2 hover:bg-[var(--surface-subtle)]"
                  >
                    Add file
                    <ChevronDown size={14} className="text-[var(--text-secondary)]" />
                  </button>

                  {isAddFileMenuOpen && (
                    <div className="absolute left-0 top-[calc(100%+6px)] w-[220px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenCreateFile?.(activeBranchForAddFile, currentDirPath || "");
                          setIsAddFileMenuOpen(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2"
                      >
                        <Plus size={14} className="text-[var(--text-secondary)]" />
                        Create new file
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenUploadFiles?.(activeBranchForAddFile, currentDirPath || "");
                          setIsAddFileMenuOpen(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2"
                      >
                        <Upload size={14} className="text-[var(--text-secondary)]" />
                        Upload files
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCodeMenuOpen((prev) => !prev);
                      setIsBranchMenuOpen(false);
                      setIsAddFileMenuOpen(false);
                    }}
                    className="h-9 px-4 rounded-md border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-sm font-semibold text-[var(--text-on-accent)] inline-flex items-center gap-2 hover:bg-[var(--accent-primary-hover)]"
                  >
                    <Code size={14} />
                    Code
                    <ChevronDown size={14} />
                  </button>

                  {isCodeMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-[460px] rounded-lg border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-2xl overflow-hidden">
                      <div className="grid grid-cols-2 text-sm font-semibold text-[var(--text-secondary)] border-b border-[var(--border-default)]">
                        <button type="button" className="h-11 bg-[var(--surface-subtle)] text-[var(--text-primary)]">Local</button>
                        <button type="button" className="h-11 hover:bg-[var(--surface-subtle)]">Codespaces</button>
                      </div>

                      <div className="p-4 space-y-4">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">Clone</div>

                        <div className="flex items-center gap-4 text-sm font-semibold text-[var(--text-secondary)] border-b border-[var(--border-default)] pb-2">
                          <button type="button" className="text-[var(--text-primary)] border-b-2 border-[var(--border-tab-active)] pb-1">HTTPS</button>
                          <button type="button">SSH</button>
                          <button type="button">GitHub CLI</button>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={cloneUrl}
                            className="flex-1 h-9 rounded-md border border-[var(--border-default)] px-3 text-sm text-[var(--text-primary)]"
                          />
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard.writeText(cloneUrl)}
                            className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)] flex items-center justify-center"
                            aria-label="Copy clone URL"
                          >
                            <Copy size={15} className="text-[var(--text-secondary)]" />
                          </button>
                        </div>

                        <p className="text-sm text-[var(--text-secondary)]">Clone using the web URL.</p>

                        <div className="space-y-1 text-sm text-[var(--text-primary)]">
                          <button type="button" className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2">
                            <Upload size={14} className="text-[var(--text-secondary)]" />
                            Open with GitHub Desktop
                          </button>
                          <button type="button" className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2">
                            <Link size={14} className="text-[var(--text-secondary)]" />
                            Open with Visual Studio
                          </button>
                          <button type="button" className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--surface-subtle)]">
                            Download ZIP
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border border-[var(--border-default)] rounded-md overflow-hidden]">
              <div className="px-4 py-3 rounded-t-md border-b border-[var(--border-default)] flex items-center justify-between gap-2 bg-[var(--surface-page)]">
                {/* LEFT SIDE: Avatar and Message */}
                <div className="min-w-0 flex items-center gap-2">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center">
                    {((latestCommit?.author || repoOwner || "U").trim().charAt(0) || "U").toUpperCase()}
                  </div>

                  {latestCommit ? (
                    <div className="min-w-0 flex items-center gap-1 text-sm">
                      <span className="font-semibold text-[var(--text-primary)] truncate max-w-[180px]">{latestCommit.author}</span>
                      <span className="text-[var(--text-secondary)] truncate">{latestCommit.message}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">No commits yet.</p>
                  )}
                </div>

                {/* RIGHT SIDE: Hash, Time, and Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {latestCommit && (
                    <div className="hidden sm:flex items-center gap-0.5 text-sm text-[var(--text-muted)]">
                      <span>{shortCommitHash(latestCommit.hash)}</span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span>{formatRelativeCommitTime(latestCommit.date)}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenCommitHistory?.(branch || "master")}
                    disabled={commitsLoading}
                    className="h-8 px-3 rounded-md bg-[var(--surface-page)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    <HistoryIcon size={14} className="text-[var(--text-secondary)]" />
                    {commitsLoading ? "Loading..." : commitCountLabel}
                  </button>
                </div>
              </div>

              <ul>
                {rootEntries.map((item, index) => {
                  const details = getItemCommitDetails(item);

                  // 1. Check if this is the very last item in the array
                  const isLast = index === rootEntries.length - 1;

                  return (
                    <li key={item.path} className="border-t border-[var(--border-muted)] first:border-t-0">
                      <button
                        type="button"
                        onClick={() => (item.type === "DIR" ? openDirectory(item.path) : openFile(item.path))}
                        // 2. Conditionally apply rounded-b-md if isLast is true
                        className={`w-full px-4 py-3 grid grid-cols-[minmax(0,1fr)_minmax(140px,260px)_130px] gap-4 text-sm hover:bg-[var(--surface-subtle)] ${isLast ? "rounded-b-md" : ""
                          }`}
                      >
                        <span className="min-w-0 flex items-center gap-2 text-left">
                          {item.type === "DIR" ? (
                            <FileDirectoryFillIcon size={16} className="text-[#54aeff] shrink-0" />
                          ) : (
                            <FileIcon size={16} className="text-[var(--text-secondary)] shrink-0" />
                          )}
                          <span className="truncate text-[var(--text-link)]">{item.name}</span>
                        </span>
                        <span className="truncate text-left text-[var(--text-secondary)]">{details.message}</span>
                        <span className="text-right text-[var(--text-secondary)]">{details.when}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="border border-[var(--border-default)] rounded-md overflow-hidden bg-[var(--surface-canvas)]">
              <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                  <BookIcon size={16} className="text-[var(--text-secondary)]" />
                  README
                </h3>
                {readmeEntry ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingReadme) {
                        setIsEditingReadme(false);
                        setReadmeEditError(null);
                        return;
                      }

                      setReadmeDraft(readmeContent || "");
                      setReadmeCommitMessage("Update README");
                      setReadmeEditError(null);
                      setIsEditingReadme(true);
                    }}
                    className="h-8 w-8 rounded-md bg-transparent text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] flex items-center justify-center"
                    aria-label="Edit README"
                  >
                    <Pencil size={15} />
                  </button>
                ) : null}
              </div>

              <div className="p-4">
                {!readmeEntry ? (
                  <div className="space-y-3 text-sm text-[var(--text-secondary)] text-center py-8">
                    <div className="inline-flex h-10 w-10 rounded-md items-center justify-center text-[var(--text-secondary)]">
                      <BookIcon size={20} />
                    </div>
                    <p className="text-3xl font-semibold text-[var(--text-primary)]">Add a README</p>
                    <p className="text-[var(--text-secondary)]">Help people interested in this repository understand your project.</p>
                    <button
                      type="button"
                      onClick={() => onOpenCreateFile?.(activeBranchForAddFile, "README.md")}
                      className="h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-xs font-semibold hover:bg-[var(--accent-primary-hover)]"
                    >
                      Add a README
                    </button>
                  </div>
                ) : isEditingReadme ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full min-h-[360px] border border-[var(--border-default)] rounded-md p-3 font-mono text-sm"
                      value={readmeDraft}
                      onChange={(e) => setReadmeDraft(e.target.value)}
                      onKeyDown={handleReadmeTextareaKeyDown}
                      spellCheck={false}
                    />

                    <input
                      type="text"
                      value={readmeCommitMessage}
                      onChange={(e) => setReadmeCommitMessage(e.target.value)}
                      placeholder="Commit message"
                      className="w-full border border-[var(--border-default)] rounded-md px-3 py-2 text-sm"
                    />

                    {readmeEditError ? <div className="text-sm text-[var(--text-danger)]">{readmeEditError}</div> : null}

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[var(--text-secondary)]">Tab indents. Ctrl+X cuts current line. Ctrl+Enter inserts a line below.</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingReadme(false);
                            setReadmeEditError(null);
                          }}
                          className="px-3 py-2 text-sm border border-[var(--border-default)] rounded-md hover:bg-[var(--surface-subtle)]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isCommittingReadme || !readmeCommitMessage.trim()}
                          onClick={handleCommitReadmeChanges}
                          className="px-4 py-2 text-sm font-medium text-[var(--text-on-accent)] bg-[var(--accent-primary)] rounded-md hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
                        >
                          {isCommittingReadme ? "Committing..." : "Commit README"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : readmeLoading ? (
                  <p className="text-sm text-[var(--text-secondary)]">Loading README...</p>
                ) : normalizedReadmeContent ? (
                  <div className="prose prose-sm max-w-none text-[var(--text-primary)]">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="mb-4 text-3xl font-semibold text-[var(--text-primary)]">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="mb-3 mt-6 text-2xl font-semibold text-[var(--text-primary)]">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="mb-2 mt-5 text-xl font-semibold text-[var(--text-primary)]">{children}</h3>
                        ),
                        p: ({ children }) => (
                          <p className="mb-4 text-sm leading-7 text-[var(--text-primary)]">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="mb-4 list-disc space-y-1 pl-6 text-sm text-[var(--text-primary)]">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="mb-4 list-decimal space-y-1 pl-6 text-sm text-[var(--text-primary)]">{children}</ol>
                        ),
                        a: ({ children, href }) => (
                          <a href={href} className="text-[var(--text-link)] underline" target="_blank" rel="noreferrer">
                            {children}
                          </a>
                        ),
                        code: ({ children }) => (
                          <code className="rounded bg-[var(--surface-subtle)] px-1 py-0.5 text-xs text-[var(--text-primary)]">{children}</code>
                        ),
                        pre: ({ children }) => (
                          <pre className="mb-4 overflow-x-auto rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text-primary)]">
                            {children}
                          </pre>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="mb-4 border-l-4 border-[var(--border-default)] pl-4 text-sm text-[var(--text-secondary)]">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {normalizedReadmeContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    README.md is present, but the content could not be loaded.
                  </p>
                )}
              </div>
            </div>
          </section>

          <aside className="xl:pl-2 space-y-6">
            <div>
              <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">About</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-6">
                {aboutText}
              </p>
            </div>

            <div className="border-t border-[var(--border-muted)] pt-4 space-y-2 text-sm text-[var(--text-secondary)]">
              {readmeEntry ? <p>Readme</p> : null}
              <p className="font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                <PulseIcon size={14} className="text-[var(--text-muted)]" />
                Activity
              </p>
              <div className="flex flex-col gap-1 text-[var(--text-secondary)]">
                <p className="inline-flex items-center gap-2">
                  <StarIcon size={14} className="text-[var(--text-muted)]" />
                  {starCount.toLocaleString()} {starCount === 1 ? "star" : "stars"}
                </p>
                <p className="inline-flex items-center gap-2">
                  <EyeIcon size={14} className="text-[var(--text-muted)]" />
                  {watchingCount.toLocaleString()} watching
                </p>
                <p className="inline-flex items-center gap-2">
                  <RepoForkedIcon size={14} className="text-[var(--text-muted)]" />
                  {forkCount.toLocaleString()} {forkCount === 1 ? "fork" : "forks"}
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--border-muted)] pt-4 space-y-2 text-sm text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">Releases</p>
              <p>No releases published</p>
            </div>

            <div className="border-t border-[var(--border-muted)] pt-4 space-y-2 text-sm text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">Packages</p>
              <p>No packages published</p>
            </div>

            <div className="border-t border-[var(--border-muted)] pt-4 space-y-2 text-sm text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">Languages</p>

              {languageBreakdownLoading ? (
                <p>Loading language breakdown...</p>
              ) : displayedLanguageBreakdown.length > 0 ? (
                <>
                  <div className="mt-2 h-2 overflow-hidden rounded-full border border-[var(--border-muted)] bg-[var(--surface-subtle)] flex">
                    {displayedLanguageBreakdown.map((item, index) => (
                      <span
                        key={`language-bar-${item.language}`}
                        className="h-full"
                        style={{
                          width: `${Math.max(item.percentage, 0.8)}%`,
                          backgroundColor: languageGraphColor(item.language, index),
                        }}
                      />
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--text-secondary)]">
                    {displayedLanguageBreakdown.map((item, index) => (
                      <div key={`language-item-${item.language}`} className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: languageGraphColor(item.language, index) }}
                        />
                        <span className="text-[var(--text-primary)]">{item.language}</span>
                        <span>{item.percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p>No language data available yet.</p>
              )}
            </div>
          </aside>
        </div>
        )
      ) : (
        <div className="h-full min-h-[560px] border border-[var(--border-default)] rounded-md overflow-hidden bg-[var(--surface-canvas)] flex">
          <aside className="w-[320px] border-r border-[var(--border-default)] bg-[var(--surface-canvas)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--border-default)] text-sm font-semibold text-[var(--text-primary)]">
              Files
            </div>

            <div className="px-3 py-2 border-b border-[var(--border-default)] text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <span className="px-2 py-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)]">{displayedBranchLabel}</span>
            </div>

            <div className="flex-1 overflow-auto py-2">
              <ul>
                <li>
                  <button
                    type="button"
                    onClick={() => openRoot()}
                    className={`w-full text-left px-3 py-1.5 text-sm font-medium ${
                      currentDirPath === "" && !selectedFilePath
                        ? "bg-[var(--surface-info-subtle)] text-[var(--text-link)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                    }`}
                  >
                    / (root)
                  </button>
                </li>
                {renderTree("")}
              </ul>
            </div>
          </aside>

          <section className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-secondary)] flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => openRoot()}
                className="hover:text-[var(--text-primary)]"
              >
                root
              </button>

              {(selectedFilePath || currentDirPath)
                .split("/")
                .filter(Boolean)
                .map((part, index, all) => {
                  const path = all.slice(0, index + 1).join("/");
                  const isLast = index === all.length - 1;
                  return (
                    <span key={`${part}-${path}`} className="flex items-center gap-1">
                      <ChevronRight size={14} className="text-[var(--text-muted)]" />
                      {selectedFilePath && isLast ? (
                        <span className="font-mono text-[var(--text-primary)]">{part}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openDirectory(path)}
                          className="hover:text-[var(--text-primary)]"
                        >
                          {part}
                        </button>
                      )}
                    </span>
                  );
                })}
            </div>

            {selectedFilePath ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="px-4 py-2 border-b border-[var(--border-default)] bg-[var(--surface-canvas)] flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{selectedFilePath}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDirectory(getParentPath(selectedFilePath))}
                      className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing((prev) => !prev);
                        setDraftContent(fileContent || "");
                        setCommitError(null);
                      }}
                      className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                  </div>
                </div>

                {fileLoading ? (
                  <div className="p-6 text-sm text-[var(--text-secondary)]">Loading file...</div>
                ) : isEditing ? (
                  <div className="p-4 space-y-3 overflow-auto">
                    <textarea
                      className="w-full min-h-[360px] border border-[var(--border-default)] rounded-md p-3 font-mono text-sm"
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      onKeyDown={handleCodeTextareaKeyDown}
                      spellCheck={false}
                    />

                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit message"
                      className="w-full border border-[var(--border-default)] rounded-md px-3 py-2 text-sm"
                    />

                    {commitError && <div className="text-sm text-[var(--text-danger)]">{commitError}</div>}
                    <p className="text-xs text-[var(--text-secondary)]">Tab indents. Ctrl+X cuts current line. Ctrl+Enter inserts a line below.</p>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isCommitting || !commitMessage.trim()}
                        onClick={handleCommitChanges}
                        className="px-4 py-2 text-sm font-medium text-[var(--text-on-accent)] bg-[var(--accent-primary)] rounded-md hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
                      >
                        {isCommitting ? "Committing..." : "Commit Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto bg-[var(--surface-canvas)] p-4">
                    <pre className="text-sm font-mono text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      <code>{fileContent || ""}</code>
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="px-4 py-3 bg-[var(--surface-subtle)] border-b border-[var(--border-default)] grid grid-cols-[minmax(0,1fr)_minmax(140px,260px)_130px] gap-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  <span>Name</span>
                  <span>Last commit message</span>
                  <span className="text-right">Last commit date</span>
                </div>

                {dirLoading && currentEntries.length === 0 ? (
                  <div className="p-5 text-sm text-[var(--text-secondary)]">Loading directory...</div>
                ) : (
                  <ul>
                    {currentDirPath !== "" && (
                      <li className="border-t border-[var(--border-muted)] first:border-t-0">
                        <button
                          type="button"
                          onClick={() => openDirectory(getParentPath(currentDirPath))}
                          className="w-full px-4 py-3 grid grid-cols-[minmax(0,1fr)_minmax(140px,260px)_130px] gap-4 text-sm hover:bg-[var(--surface-subtle)]"
                        >
                          <span className="min-w-0 flex items-center gap-2 text-left text-[var(--text-primary)]">
                            <FileDirectoryFillIcon size={16} className="text-[#54aeff] shrink-0" />
                            ..
                          </span>
                          <span className="text-left text-[var(--text-secondary)]">Up one level</span>
                          <span className="text-right text-[var(--text-secondary)]">-</span>
                        </button>
                      </li>
                    )}

                    {currentEntries.map((item) => {
                      const details = getItemCommitDetails(item);

                      return (
                        <li key={item.path} className="border-t border-[var(--border-muted)] first:border-t-0">
                          <button
                            type="button"
                            onClick={() => (item.type === "DIR" ? openDirectory(item.path) : openFile(item.path))}
                            className="w-full px-4 py-3 grid grid-cols-[minmax(0,1fr)_minmax(140px,260px)_130px] gap-4 text-sm hover:bg-[var(--surface-subtle)]"
                          >
                            <span className="min-w-0 flex items-center gap-2 text-left">
                              {item.type === "DIR" ? (
                                <FileDirectoryFillIcon size={16} className="text-[#54aeff] shrink-0" />
                              ) : (
                                <FileIcon size={16} className="text-[var(--text-secondary)] shrink-0" />
                              )}
                              <span className="truncate text-[var(--text-link)]">{item.name}</span>
                            </span>
                            <span className="truncate text-left text-[var(--text-secondary)]">{details.message}</span>
                            <span className="text-right text-[var(--text-secondary)]">{details.when}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

