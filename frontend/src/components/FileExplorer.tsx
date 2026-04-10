import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Search,
} from "lucide-react";
import type { RepoFile } from "../types";
import { reposApi } from "../services/api";

interface FileExplorerProps {
  repoId: string;
  repoName: string;
  branch: string;
  branchCount: number;
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

export default function FileExplorer({
  repoId,
  repoName,
  branch,
  branchCount,
}: FileExplorerProps) {
  const [entriesByPath, setEntriesByPath] = useState<Record<string, RepoFile[]>>({});
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));

  const [currentDirPath, setCurrentDirPath] = useState<string>("");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);

  const [rootLoading, setRootLoading] = useState<boolean>(true);
  const [dirLoading, setDirLoading] = useState<boolean>(false);
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [readmeLoading, setReadmeLoading] = useState<boolean>(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const rootEntries = useMemo(() => sortEntries(entriesByPath[""] || []), [entriesByPath]);
  const currentEntries = useMemo(
    () => sortEntries(entriesByPath[currentDirPath] || []),
    [entriesByPath, currentDirPath],
  );

  const isRootMode = selectedFilePath === null && currentDirPath === "";

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

  const loadBlob = useCallback(
    async (path: string) => {
      try {
        setLoadError(null);
        setFileLoading(true);
        setCommitError(null);

        const data = await reposApi.getBlob(repoId, path, branch);
        const content = typeof data === "string" ? data : data.content;

        setFileContent(content);
        setDraftContent(content);
        setIsEditing(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load file";
        setLoadError(message);
        setFileContent(null);
      } finally {
        setFileLoading(false);
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
    void loadDir("", true);
  }, [repoId, branch, loadDir]);

  useEffect(() => {
    const readmeEntry = (entriesByPath[""] || []).find(
      (entry) => entry.type === "FILE" && entry.name.toLowerCase().startsWith("readme"),
    );

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
  }, [entriesByPath, repoId, branch]);

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

  const openDirectory = (path: string) => {
    setCurrentDirPath(path);
    setSelectedFilePath(null);
    setFileContent(null);
    setCommitError(null);
    setIsEditing(false);
    expandPathAncestors(path);

    if (!entriesByPath[path]) {
      void loadDir(path, false);
    }
  };

  const openFile = (path: string) => {
    setSelectedFilePath(path);
    setCurrentDirPath(getParentPath(path));
    expandPathAncestors(getParentPath(path));
    if (!entriesByPath[getParentPath(path)]) {
      void loadDir(getParentPath(path), false);
    }
    void loadBlob(path);
  };

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

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();

    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const updated = `${value.slice(0, start)}\t${value.slice(end)}`;
    setDraftContent(updated);

    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1;
    });
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
              isActiveFile || isActiveDir ? "bg-[#ddf4ff] text-[#0969da]" : "text-[#24292f] hover:bg-[#f6f8fa]"
            }`}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            {isDir ? (
              <button
                type="button"
                onClick={() => toggleExpand(item.path)}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-[#eaeef2]"
                aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-[#57606a]" />
                ) : (
                  <ChevronRight size={14} className="text-[#57606a]" />
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
                <Folder size={15} className="text-[#57606a] shrink-0" />
              ) : (
                <FileText size={15} className="text-[#8c959f] shrink-0" />
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
        <div className="mb-3 p-3 text-sm border border-[#ff818266] bg-[#ffebe9] text-[#cf222e] rounded-md">
          {loadError}
        </div>
      )}

      {isRootMode ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <section className="space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-[#d1d9e0] bg-white text-sm font-medium text-[#24292f]">
                {branch || "master"}
                <ChevronDown size={14} />
              </button>
              <button className="h-9 px-3 rounded-md border border-[#d1d9e0] bg-white text-sm text-[#57606a]">
                {branchCount} Branches
              </button>
              <button className="h-9 px-3 rounded-md border border-[#d1d9e0] bg-white text-sm text-[#57606a]">
                0 Tags
              </button>

              <div className="ml-auto flex items-center gap-2 min-w-[340px] max-w-full">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c959f]" />
                  <input
                    type="text"
                    readOnly
                    placeholder="Go to file"
                    className="w-full h-9 pl-9 pr-3 rounded-md border border-[#d1d9e0] bg-white text-sm text-[#57606a]"
                  />
                </div>
                <button className="h-9 px-3 rounded-md border border-[#d1d9e0] bg-white text-sm font-medium text-[#24292f]">
                  Add file
                </button>
                <button className="h-9 px-4 rounded-md border border-[#2da44e] bg-[#2da44e] text-sm font-medium text-white">
                  Code
                </button>
              </div>
            </div>

            <div className="border border-[#d1d9e0] rounded-md overflow-hidden bg-white">
              <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d1d9e0] grid grid-cols-[minmax(0,1fr)_minmax(140px,260px)_130px] gap-4 text-xs font-semibold text-[#57606a] uppercase tracking-wide">
                <span>Name</span>
                <span>Last commit message</span>
                <span className="text-right">Last commit date</span>
              </div>

              {rootLoading ? (
                <div className="p-5 text-sm text-[#57606a]">Loading repository files...</div>
              ) : rootEntries.length === 0 ? (
                <div className="p-5 text-sm text-[#57606a]">Repository is empty.</div>
              ) : (
                <ul>
                  {rootEntries.map((item) => (
                    <li key={item.path} className="border-t border-[#d8dee4] first:border-t-0">
                      <button
                        type="button"
                        onClick={() => (item.type === "DIR" ? openDirectory(item.path) : openFile(item.path))}
                        className="w-full px-4 py-3 grid grid-cols-[minmax(0,1fr)_minmax(140px,260px)_130px] gap-4 text-sm hover:bg-[#f6f8fa]"
                      >
                        <span className="min-w-0 flex items-center gap-2 text-left">
                          {item.type === "DIR" ? (
                            <Folder size={16} className="text-[#57606a] shrink-0" />
                          ) : (
                            <FileText size={16} className="text-[#8c959f] shrink-0" />
                          )}
                          <span className="truncate text-[#0969da]">{item.name}</span>
                        </span>
                        <span className="truncate text-left text-[#57606a]">{commitMessagePlaceholder(item)}</span>
                        <span className="text-right text-[#57606a]">just now</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-[#d1d9e0] rounded-md overflow-hidden bg-white">
              <div className="px-4 py-3 border-b border-[#d1d9e0] flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#24292f]">README</h3>
                <button
                  type="button"
                  className="h-8 px-3 rounded-md border border-[#d1d9e0] bg-white text-sm text-[#57606a]"
                >
                  Edit
                </button>
              </div>

              <div className="p-4">
                {readmeLoading ? (
                  <p className="text-sm text-[#57606a]">Loading README...</p>
                ) : readmeContent ? (
                  <pre className="whitespace-pre-wrap text-sm text-[#24292f] font-mono leading-6 max-h-[420px] overflow-auto">
                    {readmeContent}
                  </pre>
                ) : (
                  <p className="text-sm text-[#57606a]">
                    README content is not available. This section is shown to mimic GitHub repository layout.
                  </p>
                )}
              </div>
            </div>
          </section>

          <aside className="xl:pl-2 space-y-6">
            <div>
              <h3 className="text-2xl font-semibold text-[#24292f] mb-3">About</h3>
              <p className="text-sm text-[#57606a] leading-6">
                {repoName} repository overview. Metadata sections are currently UI placeholders to mimic GitHub layout.
              </p>
            </div>

            <div className="border-t border-[#d8dee4] pt-4 space-y-2 text-sm text-[#57606a]">
              <p>Readme</p>
              <p>Activity</p>
              <p>0 stars</p>
              <p>1 watching</p>
              <p>0 forks</p>
            </div>

            <div className="border-t border-[#d8dee4] pt-4 space-y-2 text-sm text-[#57606a]">
              <p className="font-semibold text-[#24292f]">Releases</p>
              <p>No releases published</p>
            </div>

            <div className="border-t border-[#d8dee4] pt-4 space-y-2 text-sm text-[#57606a]">
              <p className="font-semibold text-[#24292f]">Packages</p>
              <p>No packages published</p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="h-full min-h-[560px] border border-[#d1d9e0] rounded-md overflow-hidden bg-white flex">
          <aside className="w-[320px] border-r border-[#d1d9e0] bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-[#d1d9e0] text-sm font-semibold text-[#24292f]">
              Files
            </div>

            <div className="px-3 py-2 border-b border-[#d1d9e0] text-sm text-[#57606a] flex items-center gap-2">
              <span className="px-2 py-1 rounded-md border border-[#d1d9e0] bg-[#f6f8fa]">{branch || "master"}</span>
            </div>

            <div className="flex-1 overflow-auto py-2">
              <ul>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentDirPath("");
                      setSelectedFilePath(null);
                      setFileContent(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm font-medium ${
                      currentDirPath === "" && !selectedFilePath
                        ? "bg-[#ddf4ff] text-[#0969da]"
                        : "text-[#24292f] hover:bg-[#f6f8fa]"
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
            <div className="px-4 py-3 border-b border-[#d1d9e0] bg-[#f6f8fa] text-sm text-[#57606a] flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setCurrentDirPath("");
                  setSelectedFilePath(null);
                  setFileContent(null);
                }}
                className="hover:text-[#24292f]"
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
                      <ChevronRight size={14} className="text-[#8c959f]" />
                      {selectedFilePath && isLast ? (
                        <span className="font-mono text-[#24292f]">{part}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentDirPath(path);
                            setSelectedFilePath(null);
                            setFileContent(null);
                            if (!entriesByPath[path]) void loadDir(path, false);
                          }}
                          className="hover:text-[#24292f]"
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
                <div className="px-4 py-2 border-b border-[#d1d9e0] bg-white flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-[#24292f] truncate">{selectedFilePath}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFilePath(null);
                        setFileContent(null);
                        setIsEditing(false);
                        setCommitError(null);
                      }}
                      className="h-8 px-3 rounded-md border border-[#d1d9e0] bg-white text-xs text-[#24292f] hover:bg-[#f6f8fa]"
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
                      className="h-8 px-3 rounded-md border border-[#d1d9e0] bg-white text-xs text-[#24292f] hover:bg-[#f6f8fa]"
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                  </div>
                </div>

                {fileLoading ? (
                  <div className="p-6 text-sm text-[#57606a]">Loading file...</div>
                ) : isEditing ? (
                  <div className="p-4 space-y-3 overflow-auto">
                    <textarea
                      className="w-full min-h-[360px] border border-[#d1d9e0] rounded-md p-3 font-mono text-sm"
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      onKeyDown={handleTextareaKeyDown}
                      spellCheck={false}
                    />

                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit message"
                      className="w-full border border-[#d1d9e0] rounded-md px-3 py-2 text-sm"
                    />

                    {commitError && <div className="text-sm text-[#cf222e]">{commitError}</div>}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isCommitting || !commitMessage.trim()}
                        onClick={handleCommitChanges}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#2da44e] rounded-md hover:bg-[#2c974b] disabled:opacity-50"
                      >
                        {isCommitting ? "Committing..." : "Commit Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto bg-white p-4">
                    <pre className="text-sm font-mono text-[#24292f] leading-relaxed whitespace-pre-wrap">
                      <code>{fileContent || ""}</code>
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d1d9e0] grid grid-cols-[minmax(0,1fr)_minmax(140px,260px)_130px] gap-4 text-xs font-semibold text-[#57606a] uppercase tracking-wide">
                  <span>Name</span>
                  <span>Last commit message</span>
                  <span className="text-right">Last commit date</span>
                </div>

                {dirLoading && currentEntries.length === 0 ? (
                  <div className="p-5 text-sm text-[#57606a]">Loading directory...</div>
                ) : (
                  <ul>
                    {currentDirPath !== "" && (
                      <li className="border-t border-[#d8dee4] first:border-t-0">
                        <button
                          type="button"
                          onClick={() => openDirectory(getParentPath(currentDirPath))}
                          className="w-full px-4 py-3 grid grid-cols-[minmax(0,1fr)_minmax(140px,260px)_130px] gap-4 text-sm hover:bg-[#f6f8fa]"
                        >
                          <span className="min-w-0 flex items-center gap-2 text-left text-[#24292f]">
                            <Folder size={16} className="text-[#57606a] shrink-0" />
                            ..
                          </span>
                          <span className="text-left text-[#57606a]">Up one level</span>
                          <span className="text-right text-[#57606a]">-</span>
                        </button>
                      </li>
                    )}

                    {currentEntries.map((item) => (
                      <li key={item.path} className="border-t border-[#d8dee4] first:border-t-0">
                        <button
                          type="button"
                          onClick={() => (item.type === "DIR" ? openDirectory(item.path) : openFile(item.path))}
                          className="w-full px-4 py-3 grid grid-cols-[minmax(0,1fr)_minmax(140px,260px)_130px] gap-4 text-sm hover:bg-[#f6f8fa]"
                        >
                          <span className="min-w-0 flex items-center gap-2 text-left">
                            {item.type === "DIR" ? (
                              <Folder size={16} className="text-[#57606a] shrink-0" />
                            ) : (
                              <FileText size={16} className="text-[#8c959f] shrink-0" />
                            )}
                            <span className="truncate text-[#0969da]">{item.name}</span>
                          </span>
                          <span className="truncate text-left text-[#57606a]">{commitMessagePlaceholder(item)}</span>
                          <span className="text-right text-[#57606a]">just now</span>
                        </button>
                      </li>
                    ))}
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
