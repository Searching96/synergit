import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Plus,
  Search,
} from "lucide-react";
import type { Branch, RepoFile } from "../../../types";
import { reposApi } from "../../../services/api";
import RepoBrowserSidebar from "./RepoBrowserSidebar";
import RepoBreadcrumbNavigator from "./RepoBreadcrumbNavigator";
import TwinButton from "./TwinButton";
import { applyStandardEditorShortcuts } from "./utils/editorShortcuts";
import { CommitModal } from "./CommitModal";

interface NewFilePageProps {
  mode?: "create" | "edit";
  repoId: string;
  repoName: string;
  branch: string;
  branches: Branch[];
  initialDirectoryPath?: string;
  initialFilePath?: string;
  onSelectBranch: (branchName: string) => void;
  onCancel: () => void;
  onCommitted: (createdFilePath: string, newBranchName?: string) => void;
}

function normalizeRelativePath(input: string): string {
  return input
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join("/");
}

function hasUnsafeSegments(input: string): boolean {
  const segments = input.split("/").map((segment) => segment.trim());
  return segments.some((segment) => segment === "." || segment === "..");
}

function joinPath(basePath: string, leafPath: string): string {
  const base = normalizeRelativePath(basePath);
  const leaf = normalizeRelativePath(leafPath);

  if (!base) {
    return leaf;
  }
  if (!leaf) {
    return base;
  }

  return `${base}/${leaf}`;
}

function getParentPath(path: string): string {
  const normalized = normalizeRelativePath(path);
  if (!normalized) {
    return "";
  }

  const segments = normalized.split("/");
  segments.pop();
  return segments.join("/");
}

function resolveInitialCreateLocation(inputPath: string | undefined): {
  directoryPath: string;
  suggestedFileName: string;
} {
  const normalized = normalizeRelativePath(inputPath || "");
  if (!normalized) {
    return { directoryPath: "", suggestedFileName: "" };
  }

  const segments = normalized.split("/");
  const leaf = segments[segments.length - 1] || "";
  if (leaf.toLowerCase() === "readme.md") {
    return {
      directoryPath: getParentPath(normalized),
      suggestedFileName: "README.md",
    };
  }

  return { directoryPath: normalized, suggestedFileName: "" };
}

function sortEntries(entries: RepoFile[]): RepoFile[] {
  return [...entries].sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }

    return a.type === "DIR" ? -1 : 1;
  });
}


export default function NewFilePage({
  mode = "create",
  repoId,
  repoName,
  branch,
  branches,
  initialDirectoryPath,
  initialFilePath,
  onSelectBranch,
  onCancel,
  onCommitted,
}: NewFilePageProps) {
  const [entriesByPath, setEntriesByPath] = useState<Record<string, RepoFile[]>>({});
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));
  const [currentDirPath, setCurrentDirPath] = useState<string>("");
  const [sidebarWidth, setSidebarWidth] = useState<number>(360);
  const [lastSidebarWidth, setLastSidebarWidth] = useState<number>(360);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
  const [showCommitDialog, setShowCommitDialog] = useState<boolean>(false);

  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileDirectoryPath, setFileDirectoryPath] = useState<string>("");
  const [hasLeadingSeparator, setHasLeadingSeparator] = useState<boolean>(false);
  const [fileContent, setFileContent] = useState<string>("");
  const [originalFileContent, setOriginalFileContent] = useState<string>("");
  const [originalFileName, setOriginalFileName] = useState<string>("");
  const [, setInitialContentLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeBranch = (branch || "master").trim() || "master";
  const isEditMode = mode === "edit";

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

  useEffect(() => {
    if (isSidebarCollapsed && sidebarWidth >= 320) {
      setIsSidebarCollapsed(false);
      return;
    }

    if (!isSidebarCollapsed && sidebarWidth >= 320) {
      setLastSidebarWidth(sidebarWidth);
    }
  }, [isSidebarCollapsed, sidebarWidth]);

  const ensureExpandedAncestors = useCallback((path: string) => {
    const normalized = normalizeRelativePath(path);

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
    const normalized = normalizeRelativePath(path);

    try {
      const data = await reposApi.getTree(repoId, normalized, activeBranch);
      setEntriesByPath((prev) => ({
        ...prev,
        [normalized]: sortEntries(data || []),
      }));
    } catch {
      setEntriesByPath((prev) => ({
        ...prev,
        [normalized]: [],
      }));
    }
  }, [activeBranch, repoId]);

  useEffect(() => {
    if (isEditMode) {
      const normalizedFilePath = normalizeRelativePath(initialFilePath || "");
      setCurrentDirPath(getParentPath(normalizedFilePath));
      setFileDirectoryPath("");
      setFileName(normalizedFilePath.split("/").filter(Boolean).pop() || "");
      setHasLeadingSeparator(false);
      ensureExpandedAncestors(getParentPath(normalizedFilePath));
      return;
    }

    const initialLocation = resolveInitialCreateLocation(initialDirectoryPath);
    setCurrentDirPath(initialLocation.directoryPath);
    setFileDirectoryPath("");
    setHasLeadingSeparator(false);
    if (initialLocation.suggestedFileName) {
      setFileName(initialLocation.suggestedFileName);
    }
    ensureExpandedAncestors(initialLocation.directoryPath);
  }, [ensureExpandedAncestors, initialDirectoryPath, initialFilePath, isEditMode]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const normalizedFilePath = normalizeRelativePath(initialFilePath || "");
    if (!normalizedFilePath) {
      setFileContent("");
      setOriginalFileContent("");
      return;
    }

    setInitialContentLoading(true);
    setErrorMessage(null);
    reposApi
      .getBlob(repoId, normalizedFilePath, activeBranch)
      .then((data) => {
        const content = typeof data === "string" ? data : data.content || "";
        setFileContent(content);
        setOriginalFileContent(content);
        const parts = normalizedFilePath.split("/");
        setOriginalFileName(parts[parts.length - 1] || "");
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load file for editing");
        setFileContent("");
        setOriginalFileContent("");
      })
      .finally(() => {
        setInitialContentLoading(false);
      });
  }, [activeBranch, initialFilePath, isEditMode, repoId]);

  useEffect(() => {
    setEntriesByPath({});
    setExpandedDirs(new Set([""]));
  }, [repoId, activeBranch]);

  useEffect(() => {
    void loadDir("");
  }, [loadDir]);

  useEffect(() => {
    const targets = new Set<string>();
    targets.add("");

    const normalizedCurrent = normalizeRelativePath(currentDirPath);
    if (normalizedCurrent) {
      const segments = normalizedCurrent.split("/");
      let cursor = "";
      for (const segment of segments) {
        cursor = cursor ? `${cursor}/${segment}` : segment;
        targets.add(cursor);
      }
    }

    void Promise.all(Array.from(targets).map((target) => loadDir(target)));
  }, [currentDirPath, loadDir]);

  const baseDirectoryPath = useMemo(() => normalizeRelativePath(currentDirPath || ""), [currentDirPath]);
  const normalizedInputDirectoryPath = useMemo(() => normalizeRelativePath(fileDirectoryPath), [fileDirectoryPath]);
  const targetDirectoryPath = useMemo(
    () => joinPath(baseDirectoryPath, normalizedInputDirectoryPath),
    [baseDirectoryPath, normalizedInputDirectoryPath],
  );
  const activePathSegments = useMemo(() => {
    return targetDirectoryPath ? targetDirectoryPath.split("/").filter(Boolean) : [];
  }, [targetDirectoryPath]);
  const normalizedLeafPath = useMemo(() => normalizeRelativePath(fileName), [fileName]);
  const targetFilePath = useMemo(
    () => joinPath(targetDirectoryPath, normalizedLeafPath),
    [targetDirectoryPath, normalizedLeafPath],
  );
  const editorLineNumbers = useMemo(() => {
    const count = Math.max(1, fileContent.split("\n").length);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [fileContent]);

  const validationError = useMemo(() => {
    if (!fileName.trim()) {
      return "File name is required.";
    }

    if (hasLeadingSeparator) {
      return "File path must be relative to the repository.";
    }

    const candidatePath = joinPath(fileDirectoryPath, fileName);
    if (hasUnsafeSegments(candidatePath.replace(/\\/g, "/"))) {
      return "File path cannot contain . or .. segments.";
    }

    return null;
  }, [fileDirectoryPath, fileName, hasLeadingSeparator]);

  const hasContentChanged = !isEditMode || fileContent !== originalFileContent || fileName !== originalFileName;
  const canCommit = !submitting && !validationError && targetFilePath.length > 0 && hasContentChanged;

  const handleToggleSidebar = () => {
    if (isSidebarCollapsed) {
      const nextWidth = Math.max(320, lastSidebarWidth);
      setSidebarWidth(nextWidth);
      setIsSidebarCollapsed(false);
      return;
    }

    setLastSidebarWidth(sidebarWidth);
    setSidebarWidth(56);
    setIsSidebarCollapsed(true);
    setIsBranchMenuOpen(false);
  };

  const handleBreadcrumbNavigate = useCallback((path: string) => {
    ensureExpandedAncestors(path);
    setCurrentDirPath(path);
    setFileDirectoryPath("");
    void loadDir(path);
  }, [ensureExpandedAncestors, loadDir]);

  const handleFileNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setHasLeadingSeparator(value.startsWith("/") || value.startsWith("\\"));

    const normalized = value.replace(/\\/g, "/");
    if (!normalized.includes("/")) {
      setFileName(value);
      return;
    }

    const endsWithSlash = /[\\/]$/.test(value);
    const segments = normalized.split("/").filter(Boolean);

    if (segments.length === 0) {
      setFileName("");
      return;
    }

    if (endsWithSlash) {
      setFileDirectoryPath(joinPath(fileDirectoryPath, segments.join("/")));
      setFileName("");
      return;
    }

    if (segments.length === 1) {
      setFileName(segments[0]);
      return;
    }

    const dirPart = segments.slice(0, -1).join("/");
    const leafPart = segments[segments.length - 1];
    setFileDirectoryPath(joinPath(fileDirectoryPath, dirPart));
    setFileName(leafPart);
  }, [fileDirectoryPath]);

  const handleCommit = async (fullMessage: string, isNewBranch: boolean, newBranchName: string) => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const targetBranch = isNewBranch ? newBranchName : activeBranch;

      if (isNewBranch) {
        await reposApi.createBranch(repoId, {
          name: newBranchName,
          from_branch: activeBranch,
        });
      }

      await reposApi.commitFileChange(repoId, {
        branch: targetBranch,
        path: targetFilePath,
        old_path: isEditMode && initialFilePath ? normalizeRelativePath(initialFilePath) : undefined,
        content: fileContent,
        commit_message: fullMessage,
      });

      setShowCommitDialog(false);
      onCommitted(targetFilePath, isNewBranch ? newBranchName : undefined);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : isEditMode ? "Failed to update file" : "Failed to create file");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditorTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    applyStandardEditorShortcuts(event, setFileContent);
  };

  return (
    <>
      <div className="min-h-[calc(100dvh-104px)] border-x border-x-[var(--border-default)] bg-[var(--surface-canvas)]">
        <div
          ref={layoutRef}
          className={`grid min-h-[calc(100dvh-104px)] ${isResizingSidebar ? "select-none" : ""}`}
          style={{ gridTemplateColumns: `${sidebarWidth}px 8px minmax(0,1fr)` }}
        >
          <RepoBrowserSidebar
            asideClassName="h-[calc(100dvh-104px)]"
            branches={branches}
            currentBranch={activeBranch}
            isBranchMenuOpen={isBranchMenuOpen}
            onBranchMenuOpenChange={setIsBranchMenuOpen}
            onSelectBranch={(nextBranch) => {
              onSelectBranch(nextBranch);
              setIsBranchMenuOpen(false);
            }}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            isOverlayVisible={isBranchMenuOpen}
            onCloseMenus={() => setIsBranchMenuOpen(false)}
            overlayAriaLabel="Close branch menu"
            actions={(
              <TwinButton
                leftAriaLabel="Add file"
                rightAriaLabel="Search files"
                leftIcon={<Plus size={14} className="text-[var(--text-secondary)]" />}
                rightIcon={<Search size={14} className="text-[var(--text-secondary)]" />}
              />
            )}
            entriesByPath={entriesByPath}
            expandedDirs={expandedDirs}
            currentDirPath={currentDirPath}
            normalizePath={normalizeRelativePath}
            onToggleDirectory={(path, nextExpanded) => {
              setExpandedDirs((prev) => {
                const next = new Set(prev);
                if (nextExpanded) {
                  next.add(path);
                } else {
                  next.delete(path);
                }
                return next;
              });

              if (nextExpanded) {
                void loadDir(path);
              }
            }}
            onDirectoryClick={(path) => {
              ensureExpandedAncestors(path);
              setCurrentDirPath(path);
              void loadDir(path);
            }}
            onFileClick={(path) => {
              const parent = getParentPath(path);
              ensureExpandedAncestors(parent);
              setCurrentDirPath(parent);
            }}
          />

          <div className="w-0 sticky top-0 self-start h-[calc(100dvh-104px)] relative border-r border-[var(--border-default)] bg-[var(--surface-canvas)]">
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
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-sm">
                <RepoBreadcrumbNavigator
                  rootLabel={repoName}
                  segments={activePathSegments}
                  onRootClick={() => handleBreadcrumbNavigate("")}
                  onSegmentClick={(pathUntilSegment) => handleBreadcrumbNavigate(pathUntilSegment)}
                  isLastSegmentClickable
                  showRootSeparatorWhenEmpty
                  showTrailingSeparator
                  className="inline-flex items-center"
                  rootClassName="font-semibold text-[var(--text-link)] hover:underline"
                  segmentClassName="text-[var(--text-link)] hover:underline"
                  lastSegmentClassName="text-[var(--text-link)] hover:underline"
                />

                <input
                  value={fileName}
                  onChange={handleFileNameChange}
                  placeholder={isEditMode ? "file name" : "main.c"}
                  className="h-8 w-[220px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-2 text-sm text-[var(--text-primary)]"
                />

                <span className="text-[var(--text-secondary)]">
                  in <span className="ml-1 inline-flex items-center rounded-full bg-[var(--surface-info-subtle)] text-[var(--text-link)] px-2 py-0.5 text-xs">{activeBranch}</span>
                </span>
              </div>

              <div className="shrink-0 inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={submitting}
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-60"
                >
                  Cancel changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowCommitDialog(true)}
                  disabled={!canCommit || submitting}
                  className="rounded-md border border-[var(--accent-primary)] bg-[var(--accent-primary)] px-4 py-1.5 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
                >
                  {isEditMode ? "Commit changes..." : "Commit changes..."}
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] overflow-hidden">
                <div className="px-2 py-2 border-b border-[var(--border-default)] flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditorMode("edit")}
                      className={`h-7 px-3 rounded-md text-sm ${editorMode === "edit"
                          ? "border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] font-medium"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                        }`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("preview")}
                      className={`h-7 px-3 rounded-md text-sm ${editorMode === "preview"
                          ? "border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] font-medium"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                        }`}
                    >
                      Preview
                    </button>
                  </div>

                  <div className="inline-flex items-center gap-2">
                    <button type="button" className="h-7 px-3 rounded-md border border-[var(--border-default)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2">
                      Spaces <ChevronDown size={12} />
                    </button>
                    <button type="button" className="h-7 px-3 rounded-md border border-[var(--border-default)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2">
                      2 <ChevronDown size={12} />
                    </button>
                    <button type="button" className="h-7 px-3 rounded-md border border-[var(--border-default)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2">
                      No wrap <ChevronDown size={12} />
                    </button>
                  </div>
                </div>

                {editorMode === "edit" ? (
                  <div className="grid grid-cols-[56px_minmax(0,1fr)] min-h-[560px]">
                    <div className="border-r border-[var(--border-muted)] bg-[var(--surface-subtle)] px-2 py-4 text-right text-sm text-[var(--text-muted)] select-none">
                      {editorLineNumbers.map((lineNumber) => (
                        <div key={lineNumber} className="font-mono leading-6">
                          {lineNumber}
                        </div>
                      ))}
                    </div>

                    <textarea
                      value={fileContent}
                      onChange={(event) => setFileContent(event.target.value)}
                      onKeyDown={handleEditorTextareaKeyDown}
                      placeholder="Enter file contents here"
                      spellCheck={false}
                      className="w-full min-h-[560px] p-4 font-mono text-sm leading-6 text-[var(--text-primary)] bg-[var(--surface-canvas)]"
                    />
                  </div>
                ) : (
                  <pre className="min-h-[560px] p-4 text-sm leading-6 text-[var(--text-primary)] whitespace-pre-wrap break-words font-mono">
                    {fileContent || "Nothing to preview."}
                  </pre>
                )}
              </div>

              {validationError ? (
                <p className="mt-3 text-xs text-[var(--text-danger)] inline-flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {validationError}
                </p>
              ) : null}

              {errorMessage ? (
                <p className="mt-3 text-sm text-[var(--text-danger)]">{errorMessage}</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <CommitModal
        isOpen={showCommitDialog}
        onClose={() => {
          setShowCommitDialog(false);
          setErrorMessage(null);
        }}
        onCommit={handleCommit}
        defaultCommitMessage={isEditMode ? `Update ${fileName || 'file'}` : `Add ${fileName || 'file'}`}
        submitting={submitting}
        currentBranch={activeBranch}
        error={errorMessage}
      />
    </>
  );
}
