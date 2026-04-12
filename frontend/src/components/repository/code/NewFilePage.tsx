import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  X,
} from "lucide-react";
import { FileDirectoryFillIcon, FileIcon } from "@primer/octicons-react";
import type { Branch, RepoFile } from "../../../types";
import { reposApi } from "../../../services/api";
import BranchTagMenu from "./BranchTagMenu";

interface NewFilePageProps {
  repoId: string;
  repoName: string;
  branch: string;
  branches: Branch[];
  initialDirectoryPath?: string;
  onSelectBranch: (branchName: string) => void;
  onCancel: () => void;
  onCommitted: (createdFilePath: string) => void;
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

function sortEntries(entries: RepoFile[]): RepoFile[] {
  return [...entries].sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }

    return a.type === "DIR" ? -1 : 1;
  });
}

function hasSelection(textarea: HTMLTextAreaElement): boolean {
  return textarea.selectionStart !== textarea.selectionEnd;
}

function leadingIndentation(line: string): string {
  return (line.match(/^[\t ]*/) || [""])[0];
}

function getCurrentLineBounds(value: string, cursorPosition: number): { lineStart: number; lineEnd: number } {
  const safeCursor = Math.max(0, Math.min(cursorPosition, value.length));
  const lineStart = value.lastIndexOf("\n", Math.max(0, safeCursor - 1)) + 1;
  const nextBreak = value.indexOf("\n", safeCursor);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  return { lineStart, lineEnd };
}

function insertTabAtCursor(
  textarea: HTMLTextAreaElement,
  setValue: (value: string) => void,
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const updated = `${value.slice(0, start)}\t${value.slice(end)}`;

  setValue(updated);

  requestAnimationFrame(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1;
  });
}

function insertLineBelowAtCursor(
  textarea: HTMLTextAreaElement,
  setValue: (value: string) => void,
): boolean {
  if (hasSelection(textarea)) {
    return false;
  }

  const value = textarea.value;
  const { lineStart, lineEnd } = getCurrentLineBounds(value, textarea.selectionStart);
  const currentLine = value.slice(lineStart, lineEnd);
  const indentation = leadingIndentation(currentLine);

  const updated = `${value.slice(0, lineEnd)}\n${indentation}${value.slice(lineEnd)}`;
  const nextCursor = lineEnd + 1 + indentation.length;

  setValue(updated);

  requestAnimationFrame(() => {
    textarea.selectionStart = textarea.selectionEnd = nextCursor;
  });

  return true;
}

function outdentSelectionOrLine(
  textarea: HTMLTextAreaElement,
  setValue: (value: string) => void,
): boolean {
  const value = textarea.value;
  if (!value.length) {
    return false;
  }

  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const hasSelectedText = selectionStart !== selectionEnd;

  const startLineStart = getCurrentLineBounds(value, selectionStart).lineStart;
  const lastSelectedIndex = hasSelectedText
    ? Math.max(selectionStart, selectionEnd - 1)
    : selectionStart;
  const endLineBounds = getCurrentLineBounds(value, lastSelectedIndex);

  const blockStart = startLineStart;
  const blockEnd = endLineBounds.lineEnd;
  const blockText = value.slice(blockStart, blockEnd);
  const lines = blockText.split("\n");

  const removeIndentLength = (line: string): number => {
    if (line.startsWith("\t")) {
      return 1;
    }

    let leadingSpaces = 0;
    while (leadingSpaces < line.length && line.charAt(leadingSpaces) === " " && leadingSpaces < 2) {
      leadingSpaces += 1;
    }

    return leadingSpaces;
  };

  let removedBeforeSelectionStart = 0;
  let removedBeforeSelectionEnd = 0;
  let cursor = blockStart;

  const updatedLines = lines.map((line) => {
    const removeCount = removeIndentLength(line);
    const lineStart = cursor;
    const lineEnd = lineStart + line.length;

    if (lineStart < selectionStart) {
      const charsBeforeStart = Math.max(0, Math.min(removeCount, selectionStart - lineStart));
      removedBeforeSelectionStart += charsBeforeStart;
    }

    if (lineStart < selectionEnd) {
      const charsBeforeEnd = Math.max(0, Math.min(removeCount, selectionEnd - lineStart));
      removedBeforeSelectionEnd += charsBeforeEnd;
    }

    cursor = lineEnd + 1;

    if (removeCount === 0) {
      return line;
    }

    return line.slice(removeCount);
  });

  const updatedBlock = updatedLines.join("\n");
  if (updatedBlock === blockText) {
    return false;
  }

  const updatedValue = `${value.slice(0, blockStart)}${updatedBlock}${value.slice(blockEnd)}`;
  const nextSelectionStart = Math.max(blockStart, selectionStart - removedBeforeSelectionStart);
  const nextSelectionEnd = Math.max(nextSelectionStart, selectionEnd - removedBeforeSelectionEnd);

  setValue(updatedValue);

  requestAnimationFrame(() => {
    textarea.selectionStart = nextSelectionStart;
    textarea.selectionEnd = nextSelectionEnd;
  });

  return true;
}

function cutCurrentLineAtCursor(
  textarea: HTMLTextAreaElement,
  setValue: (value: string) => void,
): boolean {
  if (hasSelection(textarea)) {
    return false;
  }

  const value = textarea.value;
  if (value.length === 0) {
    return false;
  }

  const { lineStart, lineEnd } = getCurrentLineBounds(value, textarea.selectionStart);
  const cutEnd = lineEnd < value.length ? lineEnd + 1 : lineEnd;
  const cutChunk = value.slice(lineStart, cutEnd);
  const updated = `${value.slice(0, lineStart)}${value.slice(cutEnd)}`;
  const nextCursor = Math.min(lineStart, updated.length);

  setValue(updated);

  requestAnimationFrame(() => {
    textarea.selectionStart = textarea.selectionEnd = nextCursor;
  });

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(cutChunk).catch(() => undefined);
  }

  return true;
}

export default function NewFilePage({
  repoId,
  repoName,
  branch,
  branches,
  initialDirectoryPath,
  onSelectBranch,
  onCancel,
  onCommitted,
}: NewFilePageProps) {
  const [entriesByPath, setEntriesByPath] = useState<Record<string, RepoFile[]>>({});
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));
  const [currentDirPath, setCurrentDirPath] = useState<string>("");
  const [sidebarWidth, setSidebarWidth] = useState<number>(360);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
  const [showCommitDialog, setShowCommitDialog] = useState<boolean>(false);

  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState<string>("Create new file");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeBranch = (branch || "master").trim() || "master";

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
    const normalizedInitial = normalizeRelativePath(initialDirectoryPath || "");
    setCurrentDirPath(normalizedInitial);
    ensureExpandedAncestors(normalizedInitial);
  }, [ensureExpandedAncestors, initialDirectoryPath]);

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

  const renderTreeNodes = useCallback((path: string, depth: number): ReactElement[] => {
    const normalized = normalizeRelativePath(path);
    const entries = sortEntries(entriesByPath[normalized] || []);
    const nodes: ReactElement[] = [];

    for (const entry of entries) {
      const isDirectory = entry.type === "DIR";
      const isExpanded = isDirectory && expandedDirs.has(entry.path);
      const isActive = currentDirPath === entry.path;

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
                  ensureExpandedAncestors(entry.path);
                  setCurrentDirPath(entry.path);
                  void loadDir(entry.path);
                } else {
                  const parent = getParentPath(entry.path);
                  ensureExpandedAncestors(parent);
                  setCurrentDirPath(parent);
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

          {isDirectory && isExpanded ? <ul>{renderTreeNodes(entry.path, depth + 1)}</ul> : null}
        </li>,
      );
    }

    return nodes;
  }, [currentDirPath, entriesByPath, ensureExpandedAncestors, expandedDirs, loadDir]);

  const baseDirectoryPath = useMemo(() => normalizeRelativePath(currentDirPath || ""), [currentDirPath]);
  const normalizedLeafPath = useMemo(() => normalizeRelativePath(fileName), [fileName]);
  const targetFilePath = useMemo(() => joinPath(baseDirectoryPath, normalizedLeafPath), [baseDirectoryPath, normalizedLeafPath]);
  const editorLineNumbers = useMemo(() => {
    const count = Math.max(1, fileContent.split("\n").length);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [fileContent]);

  const validationError = useMemo(() => {
    if (!fileName.trim()) {
      return "File name is required.";
    }

    if (fileName.startsWith("/") || fileName.startsWith("\\")) {
      return "File path must be relative to the repository.";
    }

    if (hasUnsafeSegments(fileName.replace(/\\/g, "/"))) {
      return "File path cannot contain . or .. segments.";
    }

    return null;
  }, [fileName]);

  const canCommit = !submitting && !validationError && targetFilePath.length > 0;

  const handleCommit = async () => {
    if (!canCommit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const message = commitMessage.trim() || "Create new file";
      const fullMessage = description.trim() ? `${message}\n\n${description.trim()}` : message;

      await reposApi.commitFileChange(repoId, {
        branch: activeBranch,
        path: targetFilePath,
        content: fileContent,
        commit_message: fullMessage,
      });

      setShowCommitDialog(false);
      onCommitted(targetFilePath);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create file");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditorTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "x") {
      if (!hasSelection(event.currentTarget)) {
        event.preventDefault();
        cutCurrentLineAtCursor(event.currentTarget, setFileContent);
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key === "Enter") {
      if (!hasSelection(event.currentTarget)) {
        event.preventDefault();
        insertLineBelowAtCursor(event.currentTarget, setFileContent);
      }
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    if (event.shiftKey) {
      outdentSelectionOrLine(event.currentTarget, setFileContent);
      return;
    }

    insertTabAtCursor(event.currentTarget, setFileContent);
  };

  return (
    <>
      <div className="min-h-[calc(100dvh-104px)] border border-[var(--border-default)] bg-[var(--surface-canvas)]">
        <div
          ref={layoutRef}
          className={`grid min-h-[calc(100dvh-104px)] ${isResizingSidebar ? "select-none" : ""}`}
          style={{ gridTemplateColumns: `${sidebarWidth}px 8px minmax(0,1fr)` }}
        >
          <aside className="sticky top-0 self-start h-[calc(100dvh-104px)] border-r border-[var(--border-default)] bg-[var(--surface-canvas)] flex flex-col">
            <div className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">Files</div>

            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center gap-2">
                {isBranchMenuOpen ? (
                  <button
                    type="button"
                    aria-label="Close branch menu"
                    onClick={() => setIsBranchMenuOpen(false)}
                    className="fixed inset-0 z-10"
                  />
                ) : null}

                <BranchTagMenu
                  className="relative z-20 flex-1 min-w-0"
                  branches={branches}
                  currentBranch={activeBranch}
                  isOpen={isBranchMenuOpen}
                  onOpenChange={(open) => setIsBranchMenuOpen(open)}
                  onSelectBranch={(nextBranch) => {
                    onSelectBranch(nextBranch);
                    setIsBranchMenuOpen(false);
                  }}
                />

                <button
                  type="button"
                  className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-[var(--text-primary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
                  aria-label="Add file"
                >
                  <Plus size={14} className="text-[var(--text-secondary)]" />
                </button>

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
              <ul>
                {currentDirPath ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        const parent = getParentPath(currentDirPath);
                        ensureExpandedAncestors(parent);
                        setCurrentDirPath(parent);
                      }}
                      className="w-full text-left px-2 py-1.5 text-sm text-[var(--text-link)] hover:bg-[var(--surface-subtle)] rounded-sm"
                    >
                      ..
                    </button>
                  </li>
                ) : null}
                {renderTreeNodes("", 0)}
              </ul>
            </div>
          </aside>

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
                <span className="font-semibold text-[var(--text-link)]">{repoName}</span>
                <span className="text-[var(--text-muted)]">/</span>

                {baseDirectoryPath ? (
                  <span className="text-[var(--text-link)]">{baseDirectoryPath}/</span>
                ) : null}

                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder="main.c"
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
                  onClick={() => {
                    if (!canCommit) {
                      setErrorMessage(validationError || "Please provide a valid file path.");
                      return;
                    }
                    setErrorMessage(null);
                    setShowCommitDialog(true);
                  }}
                  disabled={submitting}
                  className="h-8 px-4 rounded-md border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
                >
                  Commit changes...
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
                      className={`h-7 px-3 rounded-md text-sm ${
                        editorMode === "edit"
                          ? "border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] font-medium"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("preview")}
                      className={`h-7 px-3 rounded-md text-sm ${
                        editorMode === "preview"
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

      {showCommitDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close commit dialog"
            onClick={() => {
              if (!submitting) {
                setShowCommitDialog(false);
              }
            }}
            className="absolute inset-0 bg-black/35"
          />

          <div className="relative z-10 w-full max-w-[560px] rounded-lg border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Commit changes</h3>
              <button
                type="button"
                onClick={() => {
                  if (!submitting) {
                    setShowCommitDialog(false);
                  }
                }}
                className="h-8 w-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                Committing directly to <span className="font-medium text-[var(--text-primary)]">{activeBranch}</span>.
              </p>

              <input
                value={commitMessage}
                onChange={(event) => setCommitMessage(event.target.value)}
                placeholder="Commit message"
                className="w-full h-10 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
              />

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add an optional extended description..."
                className="w-full min-h-[96px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-3 text-sm text-[var(--text-primary)]"
              />

              <p className="text-xs text-[var(--text-secondary)]">This will create {targetFilePath || "the new file"}.</p>

              {errorMessage ? <p className="text-sm text-[var(--text-danger)]">{errorMessage}</p> : null}
            </div>

            <div className="px-4 py-3 border-t border-[var(--border-default)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCommitDialog(false)}
                disabled={submitting}
                className="h-9 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCommit()}
                disabled={!canCommit}
                className="h-9 px-4 rounded-md border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
              >
                {submitting ? "Committing..." : "Commit changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
