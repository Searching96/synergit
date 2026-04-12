import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  ChevronDown,
  ChevronRight,
  Cloud,
  Copy,
  Download,
  FileText,
  FolderOpen,
  History,
  Maximize2,
  Pencil,
  Plus,
  Search,
  Upload,
  Users,
} from "lucide-react";
import { FileDirectoryFillIcon, FileIcon } from "@primer/octicons-react";
import type { Branch, Commit, RepoFile } from "../../../types";
import { reposApi } from "../../../services/api";
import BranchTagMenu from "./BranchTagMenu";

type ExplorerLocation = {
  type: "root" | "file" | "dir";
  path?: string;
};

interface RepoTreeBrowserPageProps {
  repoId: string;
  repoName: string;
  branch: string;
  branches: Branch[];
  initialLocation?: ExplorerLocation;
  onNavigateLocation?: (location: ExplorerLocation) => void;
  onSelectBranch: (branchName: string) => void;
  onOpenCommitHistory?: (branchName: string) => void;
  onOpenCreateFile?: (branchName: string, directoryPath: string) => void;
  onOpenUploadFiles?: (branchName: string, directoryPath: string) => void;
}

function normalizePath(input: string): string {
  return input
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join("/");
}

function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  if (!normalized) {
    return "";
  }

  const segments = normalized.split("/");
  segments.pop();
  return segments.join("/");
}

function sortEntries(entries: RepoFile[]): RepoFile[] {
  return [...entries].sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }

    return a.type === "DIR" ? -1 : 1;
  });
}

function shortHash(hash: string): string {
  return hash.trim().slice(0, 7);
}

function formatRelativeTime(dateValue: string): string {
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

function authorInitial(author: string): string {
  return (author.trim().charAt(0) || "U").toUpperCase();
}

export default function RepoTreeBrowserPage({
  repoId,
  repoName,
  branch,
  branches,
  initialLocation,
  onNavigateLocation,
  onSelectBranch,
  onOpenCommitHistory,
  onOpenCreateFile,
  onOpenUploadFiles,
}: RepoTreeBrowserPageProps) {
  const [entriesByPath, setEntriesByPath] = useState<Record<string, RepoFile[]>>({});
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));
  const [currentDirPath, setCurrentDirPath] = useState<string>("");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [loadingPathSet, setLoadingPathSet] = useState<Set<string>>(new Set());
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState<boolean>(false);
  const [isAddFileMenuOpen, setIsAddFileMenuOpen] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recentCommits, setRecentCommits] = useState<Commit[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState<number>(360);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const activeBranch = (branch || "master").trim() || "master";

  const latestCommit = recentCommits[0] || null;
  const latestCommitMessage = latestCommit?.message?.trim() || "Update files";
  const latestCommitWhen = latestCommit ? formatRelativeTime(latestCommit.date) : "just now";

  const activePath = selectedFilePath || currentDirPath;
  const activePathSegments = activePath ? activePath.split("/").filter(Boolean) : [];

  useEffect(() => {
    if (!isResizingSidebar) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = layoutRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const minWidth = 320;
      const maxWidth = Math.max(minWidth, Math.min(560, rect.width - 240));
      const nextWidth = event.clientX - rect.left;
      const clamped = Math.max(minWidth, Math.min(maxWidth, nextWidth));

      setSidebarWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar]);

  const ensureExpandedAncestors = useCallback((path: string) => {
    const normalized = normalizePath(path);
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      next.add("");

      if (!normalized) {
        return next;
      }

      const segments = normalized.split("/");
      let cursor = "";
      for (const segment of segments) {
        cursor = cursor ? `${cursor}/${segment}` : segment;
        next.add(cursor);
      }

      return next;
    });
  }, []);

  const loadDir = useCallback(async (path: string) => {
    const normalized = normalizePath(path);

    setLoadingPathSet((prev) => {
      const next = new Set(prev);
      next.add(normalized);
      return next;
    });

    try {
      const data = await reposApi.getTree(repoId, normalized, activeBranch);
      setEntriesByPath((prev) => ({
        ...prev,
        [normalized]: sortEntries(data || []),
      }));
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load repository tree");
      setEntriesByPath((prev) => ({
        ...prev,
        [normalized]: [],
      }));
    } finally {
      setLoadingPathSet((prev) => {
        const next = new Set(prev);
        next.delete(normalized);
        return next;
      });
    }
  }, [activeBranch, repoId]);

  const openDirectory = useCallback(async (path: string) => {
    const normalized = normalizePath(path);

    ensureExpandedAncestors(normalized);
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      next.add(normalized);
      return next;
    });

    setCurrentDirPath(normalized);
    setSelectedFilePath(null);
    setIsAddFileMenuOpen(false);

    await loadDir(normalized);
    onNavigateLocation?.({ type: "dir", path: normalized });
  }, [ensureExpandedAncestors, loadDir, onNavigateLocation]);

  const openFile = useCallback((path: string) => {
    const normalized = normalizePath(path);
    const parent = getParentPath(normalized);

    ensureExpandedAncestors(parent);
    setCurrentDirPath(parent);
    setSelectedFilePath(normalized);
    setIsAddFileMenuOpen(false);

    onNavigateLocation?.({ type: "file", path: normalized });
  }, [ensureExpandedAncestors, onNavigateLocation]);

  const openTreeRoot = useCallback(async () => {
    setSelectedFilePath(null);
    setCurrentDirPath("");
    ensureExpandedAncestors("");
    await loadDir("");
    onNavigateLocation?.({ type: "dir", path: "" });
  }, [ensureExpandedAncestors, loadDir, onNavigateLocation]);

  useEffect(() => {
    const normalizedInitialPath = normalizePath(initialLocation?.path || "");

    if (initialLocation?.type === "file" && normalizedInitialPath) {
      const parent = getParentPath(normalizedInitialPath);
      setCurrentDirPath(parent);
      setSelectedFilePath(normalizedInitialPath);
      ensureExpandedAncestors(parent);
      return;
    }

    if (initialLocation?.type === "dir") {
      setCurrentDirPath(normalizedInitialPath);
      setSelectedFilePath(null);
      ensureExpandedAncestors(normalizedInitialPath);
      return;
    }

    setCurrentDirPath("");
    setSelectedFilePath(null);
    ensureExpandedAncestors("");
  }, [ensureExpandedAncestors, initialLocation?.path, initialLocation?.type]);

  useEffect(() => {
    setEntriesByPath({});
    setExpandedDirs(new Set([""]));
    setLoadError(null);
  }, [repoId, activeBranch]);

  useEffect(() => {
    void loadDir("");
  }, [loadDir]);

  useEffect(() => {
    const targets = new Set<string>();
    targets.add("");

    const normalizedCurrent = normalizePath(currentDirPath);
    if (normalizedCurrent) {
      const segments = normalizedCurrent.split("/");
      let cursor = "";
      for (const segment of segments) {
        cursor = cursor ? `${cursor}/${segment}` : segment;
        targets.add(cursor);
      }
    }

    void Promise.all(Array.from(targets).map((path) => loadDir(path)));
  }, [currentDirPath, loadDir]);

  useEffect(() => {
    if (!selectedFilePath) {
      setFileContent("");
      setFileLoading(false);
      return;
    }

    setFileLoading(true);
    reposApi
      .getBlob(repoId, selectedFilePath, activeBranch)
      .then((data) => {
        if (typeof data === "string") {
          setFileContent(data);
          return;
        }

        setFileContent(data?.content || "");
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load file");
        setFileContent("");
      })
      .finally(() => {
        setFileLoading(false);
      });
  }, [activeBranch, repoId, selectedFilePath]);

  useEffect(() => {
    reposApi
      .getCommits(repoId, activeBranch)
      .then((data) => {
        setRecentCommits(data || []);
      })
      .catch(() => {
        setRecentCommits([]);
      });
  }, [activeBranch, repoId]);

  const currentEntries = useMemo(() => {
    return sortEntries(entriesByPath[normalizePath(currentDirPath)] || []);
  }, [currentDirPath, entriesByPath]);

  const fileLines = useMemo(() => {
    return fileContent.split("\n");
  }, [fileContent]);

  const fileLocCount = useMemo(() => {
    return fileLines.filter((line) => line.trim().length > 0).length;
  }, [fileLines]);

  const fileByteCount = useMemo(() => {
    try {
      return new TextEncoder().encode(fileContent).length;
    } catch {
      return fileContent.length;
    }
  }, [fileContent]);

  const renderTreeNodes = useCallback((path: string, depth: number): ReactElement[] => {
    const normalized = normalizePath(path);
    const entries = sortEntries(entriesByPath[normalized] || []);

    const nodes: ReactElement[] = [];
    for (const entry of entries) {
      const isDirectory = entry.type === "DIR";
      const isExpanded = isDirectory && expandedDirs.has(entry.path);
      const isActive = selectedFilePath ? selectedFilePath === entry.path : currentDirPath === entry.path;

      nodes.push(
        <li key={entry.path}>
          <div
            className="flex items-center"
            style={{ paddingLeft: `${Math.max(0, depth * 10)}px` }}
          >
            {isDirectory ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  const nextExpanded = !expandedDirs.has(entry.path);
                  setExpandedDirs((prev) => {
                    const next = new Set(prev);
                    if (nextExpanded) {
                      next.add(entry.path);
                    } else {
                      next.delete(entry.path);
                    }
                    return next;
                  });

                  if (nextExpanded) {
                    void loadDir(entry.path);
                  }
                }}
                className="h-6 w-5 shrink-0 inline-flex items-center justify-center text-[var(--text-secondary)]"
                aria-label={isExpanded ? "Collapse directory" : "Expand directory"}
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <span className="h-6 w-5 shrink-0" />
            )}

            <button
              type="button"
              onClick={() => {
                if (isDirectory) {
                  void openDirectory(entry.path);
                } else {
                  openFile(entry.path);
                }
              }}
              className={`flex-1 h-6 pr-2 text-left text-sm rounded-sm inline-flex items-center gap-2 ${
                isActive
                  ? "bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              {isDirectory ? (
                <FileDirectoryFillIcon size={14} className="text-[#54aeff] shrink-0" />
              ) : (
                <FileIcon size={14} className="text-[var(--text-secondary)] shrink-0" />
              )}
              <span className="truncate">{entry.name}</span>
            </button>
          </div>

          {isDirectory && isExpanded ? (
            <ul>{renderTreeNodes(entry.path, depth + 1)}</ul>
          ) : null}
        </li>,
      );
    }

    return nodes;
  }, [currentDirPath, entriesByPath, expandedDirs, loadDir, openDirectory, openFile, selectedFilePath]);

  return (
    <div className="min-h-[620px] border border-[var(--border-default)] bg-[var(--surface-canvas)]">
      <div
        ref={layoutRef}
        className={`grid min-h-[620px] ${isResizingSidebar ? "select-none" : ""}`}
        style={{ gridTemplateColumns: `${sidebarWidth}px 8px minmax(0,1fr)` }}
      >
        <aside className="sticky top-0 self-start h-[calc(100vh-104px)] border-r border-[var(--border-default)] bg-[var(--surface-canvas)] flex flex-col">
          <div className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">Files</div>

          <div className="px-3 py-2 space-y-2">
            <div className="flex items-center gap-2">
              {(isBranchMenuOpen || isAddFileMenuOpen) ? (
                <button
                  type="button"
                  aria-label="Close menus"
                  onClick={() => {
                    setIsBranchMenuOpen(false);
                    setIsAddFileMenuOpen(false);
                  }}
                  className="fixed inset-0 z-10"
                />
              ) : null}

              <BranchTagMenu
                className="relative z-20 flex-1 min-w-0"
                branches={branches}
                currentBranch={activeBranch}
                isOpen={isBranchMenuOpen}
                onOpenChange={(open) => {
                  setIsBranchMenuOpen(open);
                  if (open) {
                    setIsAddFileMenuOpen(false);
                  }
                }}
                onSelectBranch={(nextBranch) => {
                  onSelectBranch(nextBranch);
                  setIsBranchMenuOpen(false);
                }}
              />

              <div className="relative z-20">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddFileMenuOpen((prev) => !prev);
                    setIsBranchMenuOpen(false);
                  }}
                  className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-[var(--text-primary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
                  aria-label="Add file"
                >
                  <Plus size={14} className="text-[var(--text-secondary)]" />
                </button>

                {isAddFileMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+6px)] w-[220px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg overflow-hidden z-20">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCreateFile?.(activeBranch, currentDirPath || "");
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
                        onOpenUploadFiles?.(activeBranch, currentDirPath || "");
                        setIsAddFileMenuOpen(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2"
                    >
                      <Upload size={14} className="text-[var(--text-secondary)]" />
                      Upload files
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
                aria-label="Search files"
              >
                <Search size={14} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                readOnly
                placeholder="Go to file"
                className="w-full h-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-9 pr-3 text-sm text-[var(--text-secondary)]"
              />
            </div>
          </div>

          <div className="px-2 py-2 flex-1 min-h-0 overflow-auto">
            <ul>{renderTreeNodes("", 0)}</ul>
          </div>
        </aside>

        <div className="w-0 sticky top-0 self-start h-[calc(100vh-104px)] relative border-r border-[var(--border-default)] bg-[var(--surface-canvas)]">
          <button
            type="button"
            aria-label="Resize sidebar"
            onMouseDown={(event) => {
              event.preventDefault();
              setIsResizingSidebar(true);
            }}
            onDoubleClick={() => setSidebarWidth(360)}
            className="w-1 absolute inset-y-0 left-1/2 -translate-x-1/2 cursor-col-resize hover:bg-[var(--surface-subtle)]"
          />
        </div>

        <section className="min-w-0 bg-[var(--surface-canvas)]">
          <div className="px-4 py-3 text-sm text-[var(--text-secondary)] flex items-center justify-between gap-3">
            <div className="min-w-0 overflow-x-auto whitespace-nowrap">
              <button
                type="button"
                onClick={() => {
                  void openTreeRoot();
                }}
                className="font-semibold text-[var(--text-link)] hover:underline"
              >
                {repoName}
              </button>
              {activePathSegments.map((segment, index) => {
                const pathUntilSegment = activePathSegments.slice(0, index + 1).join("/");
                const isLast = index === activePathSegments.length - 1;
                const isSelectedFileLastSegment = !!selectedFilePath && isLast;

                return (
                  <span key={pathUntilSegment}>
                    <span className="mx-1 text-[var(--text-muted)]">/</span>
                    {isSelectedFileLastSegment ? (
                      <span className="text-[var(--text-primary)]">{segment}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          void openDirectory(pathUntilSegment);
                        }}
                        className="text-[var(--text-link)] hover:underline"
                      >
                        {segment}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const value = [repoName, ...activePathSegments].join("/");
                if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                  void navigator.clipboard.writeText(value).catch(() => undefined);
                }
              }}
              className="h-8 w-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] inline-flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] shrink-0"
              aria-label={selectedFilePath ? "Copy file path" : "Copy directory path"}
            >
              <Copy size={14} />
            </button>
          </div>

          {loadError ? (
            <div className="px-4 py-3 text-sm text-[var(--text-danger)] border-b border-[var(--border-default)]">
              {loadError}
            </div>
          ) : null}

          {selectedFilePath ? (
            <div className="px-4 pb-4 space-y-3">
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center justify-center shrink-0">
                      {authorInitial(latestCommit?.author || "")}
                    </div>
                    <div className="min-w-0 text-sm text-[var(--text-secondary)] truncate">
                      <span className="font-semibold text-[var(--text-primary)] mr-2">{latestCommit?.author || "Unknown"}</span>
                      <span className="truncate">{latestCommitMessage}</span>
                    </div>
                  </div>

                  <div className="shrink-0 inline-flex items-center gap-2">
                    {latestCommit ? (
                      <span className="hidden md:inline text-xs text-[var(--text-secondary)]">
                        {shortHash(latestCommit.hash)} · {latestCommitWhen}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onOpenCommitHistory?.(activeBranch)}
                      className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2"
                    >
                      <History size={14} className="text-[var(--text-secondary)]" />
                      History
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] overflow-hidden">
                <div className="px-2 py-2 border-b border-[var(--border-default)] flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2 text-sm">
                    <button type="button" className="h-7 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] font-medium">
                      Code
                    </button>
                    <button type="button" className="h-7 px-3 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]">
                      Blame
                    </button>
                    <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {fileLines.length} lines ({fileLocCount} loc) · {fileByteCount.toLocaleString()} Bytes
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" className="h-7 w-7 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]" aria-label="Open file tree action">
                      <FolderOpen size={13} />
                    </button>
                    <button type="button" className="h-7 w-7 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]" aria-label="Collaborators">
                      <Users size={13} />
                    </button>
                    <button type="button" className="h-7 w-7 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]" aria-label="Download from cloud">
                      <Cloud size={13} />
                    </button>
                    <button type="button" className="h-7 px-2 rounded-md border border-[var(--border-default)] text-xs text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]">Raw</button>
                    <button type="button" className="h-7 w-7 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]" aria-label="Copy raw content">
                      <Copy size={13} />
                    </button>
                    <button type="button" className="h-7 w-7 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]" aria-label="Download file">
                      <Download size={13} />
                    </button>
                    <button type="button" className="h-7 w-7 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]" aria-label="Edit file">
                      <Pencil size={13} />
                    </button>
                    <button type="button" className="h-7 w-7 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]" aria-label="More file actions">
                      <ChevronDown size={13} />
                    </button>
                    <button type="button" className="h-7 w-7 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]" aria-label="Expand view">
                      <Maximize2 size={13} />
                    </button>
                  </div>
                </div>

                {fileLoading ? (
                  <div className="p-4 text-sm text-[var(--text-secondary)]">Loading file...</div>
                ) : (
                  <div>
                    <table className="w-full border-collapse text-sm font-mono">
                      <tbody>
                        {fileLines.map((line, index) => (
                          <tr key={`${index + 1}-${line.slice(0, 12)}`}>
                            <td className="w-[64px] px-3 py-1 text-right select-none text-[var(--text-muted)] bg-[var(--surface-subtle)] align-top border-r border-[var(--border-muted)]">{index + 1}</td>
                            <td className="px-4 py-1 text-[var(--text-primary)] align-top">
                              <pre className="m-0 whitespace-pre-wrap break-words">{line || " "}</pre>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-3">
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center justify-center shrink-0">
                      {authorInitial(latestCommit?.author || "")}
                    </div>
                    <div className="min-w-0 text-sm text-[var(--text-secondary)] truncate">
                      <span className="font-semibold text-[var(--text-primary)] mr-2">{latestCommit?.author || "Unknown"}</span>
                      <span className="truncate">{latestCommitMessage}</span>
                    </div>
                  </div>

                  <div className="shrink-0 inline-flex items-center gap-2">
                    {latestCommit ? (
                      <span className="hidden md:inline text-xs text-[var(--text-secondary)]">
                        {shortHash(latestCommit.hash)} · {latestCommitWhen}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onOpenCommitHistory?.(activeBranch)}
                      className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2"
                    >
                      <History size={14} className="text-[var(--text-secondary)]" />
                      History
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(220px,1fr)_160px] gap-4 px-4 py-2 border-b border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  <span>Name</span>
                  <span>Last commit message</span>
                  <span className="text-right">Last commit date</span>
                </div>

                <ul>
                  {currentDirPath ? (
                    <li className="border-b border-[var(--border-muted)]">
                      <button
                        type="button"
                        onClick={() => {
                          void openDirectory(getParentPath(currentDirPath));
                        }}
                        className="w-full grid grid-cols-[minmax(0,1fr)_minmax(220px,1fr)_160px] gap-4 px-4 py-2 text-sm hover:bg-[var(--surface-subtle)]"
                      >
                        <span className="min-w-0 inline-flex items-center gap-2 text-[var(--text-link)]">
                          <FileDirectoryFillIcon size={16} className="text-[#54aeff]" />
                          ..
                        </span>
                        <span className="text-right text-[var(--text-secondary)]">-</span>
                      </button>
                    </li>
                  ) : null}

                  {currentEntries.map((entry) => (
                    <li key={entry.path} className="border-b border-[var(--border-muted)] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (entry.type === "DIR") {
                            void openDirectory(entry.path);
                          } else {
                            openFile(entry.path);
                          }
                        }}
                        className="w-full grid grid-cols-[minmax(0,1fr)_minmax(220px,1fr)_160px] gap-4 px-4 py-2 text-sm hover:bg-[var(--surface-subtle)]"
                      >
                        <span className="min-w-0 inline-flex items-center gap-2 text-left">
                          {entry.type === "DIR" ? (
                            <FileDirectoryFillIcon size={16} className="text-[#54aeff]" />
                          ) : (
                            <FileIcon size={16} className="text-[var(--text-secondary)]" />
                          )}
                          <span className="truncate text-[var(--text-link)]">{entry.name}</span>
                        </span>
                        <span className="text-left text-[var(--text-secondary)] truncate inline-flex items-center gap-2">
                          <FileText size={12} className="text-[var(--text-muted)]" />
                          {latestCommitMessage}
                        </span>
                        <span className="text-right text-[var(--text-secondary)]">{latestCommitWhen}</span>
                      </button>
                    </li>
                  ))}

                  {currentEntries.length === 0 && !loadingPathSet.has(normalizePath(currentDirPath)) ? (
                    <li className="px-4 py-6 text-sm text-[var(--text-secondary)]">No files found in this directory.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
