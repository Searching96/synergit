import { useEffect, useRef, useState, type ReactElement, type MouseEvent as ReactMouseEvent } from "react";
import type { RepoFile } from "../types";
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { reposApi } from "../services/api";

interface FileExplorerProps {
  repoId: string;
  branch: string;
}

export default function FileExplorer({ repoId, branch }: FileExplorerProps) {
	const [treeByPath, setTreeByPath] = useState<Record<string, RepoFile[]>>({});
	const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['']));
	const [currentPath, setCurrentPath] = useState<string>('');
	const [fileContent, setFileContent] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(288);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  
  const prevRepoIdRef = useRef<string>(repoId);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(288);

	// Keep current opened file when branch changes; reset only on repository changes.
	useEffect(() => {
    const repoChanged = prevRepoIdRef.current !== repoId;
    prevRepoIdRef.current = repoId;

    if (repoChanged) {
      setExpandedDirs(new Set(['']));
		  loadDir('');
      setCurrentPath('');
      setFileContent(null);
      setIsEditing(false);
      setDraftContent('');
      setCommitMessage('');
      setCommitError(null);
      return;
    }

    loadDir('');

    if (fileContent !== null && currentPath) {
      loadBlob(currentPath);
      return;
    }
  }, [repoId, branch])

  useEffect(() => {
    if (!isResizingSidebar) return;

    const onMouseMove = (e: MouseEvent) => {
      const min = 200;
      const max = Math.floor(window.innerWidth * 0.55);
      const nextWidth = resizeStartWidthRef.current + (e.clientX - resizeStartXRef.current);
      setSidebarWidth(Math.max(min, Math.min(max, nextWidth)));
    };

    const onMouseUp = () => setIsResizingSidebar(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizingSidebar]);

	const loadDir = (path: string) => {
    reposApi.getTree(repoId, path, branch)
			.then((data) => {
        setTreeByPath((prev) => ({ ...prev, [path]: data || [] }));
      })
			.catch(console.error);
	};

	const loadBlob = (path: string) => {
		setCurrentPath(path);
    setCommitError(null);
    setFileLoading(true);
    reposApi.getBlob(repoId, path, branch)
			.then((data) => {
				const textToDisplay = typeof data === 'string' ? data : data.content;
				setFileContent(textToDisplay);
        setDraftContent(textToDisplay);
        setIsEditing(false);
			})
			.catch(console.error)
      .finally(() => setFileLoading(false));
	}

  const handleCommitChanges = async () => {
    if (!currentPath || fileContent === null || !commitMessage.trim()) return;

    try {
      setIsCommitting(true);
      setCommitError(null);

      await reposApi.commitFileChange(repoId, {
        branch,
        path: currentPath,
        content: draftContent,
        commit_message: commitMessage.trim(),
      });

      setFileContent(draftContent);
      setIsEditing(false);
      setCommitMessage('');
    } catch (err: any) {
      setCommitError(err?.message || 'Failed to commit changes');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return;
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

	const handleItemClick = (item: RepoFile) => {
		if (item.type === 'dir') {
			setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(item.path)) {
          next.delete(item.path);
        } else {
          next.add(item.path);
          if (!treeByPath[item.path]) {
            loadDir(item.path);
          }
        }
        return next;
      });
		} else {
			loadBlob(item.path);
		}
	};

  const sortEntries = (entries: RepoFile[]) => {
    return [...entries].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'dir' ? -1 : 1;
    });
  };

  const renderDir = (path: string, depth: number = 0): ReactElement[] => {
    const entries = sortEntries(treeByPath[path] || []);
    const nodes: ReactElement[] = [];

    entries.forEach((item) => {
      const isDir = item.type === 'dir';
      const isExpanded = isDir && expandedDirs.has(item.path);
      const isActiveFile = !isDir && currentPath === item.path;

      nodes.push(
        <button
          key={item.path}
          onClick={() => handleItemClick(item)}
          className={`w-full flex items-center gap-2 py-1.5 pr-2 text-sm text-left hover:bg-gray-100 ${
            isActiveFile ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {isDir ? (
            isExpanded ? <ChevronDown size={14} className="text-gray-500 shrink-0" /> : <ChevronRight size={14} className="text-gray-500 shrink-0" />
          ) : (
            <span className="w-[14px] shrink-0" />
          )}

          {isDir ? <Folder size={16} className="text-gray-500 shrink-0" /> : <FileText size={16} className="text-gray-400 shrink-0" />}
          <span className="truncate">{item.name}</span>
        </button>,
      );

      if (isDir && isExpanded) {
        nodes.push(...renderDir(item.path, depth + 1));
      }
    });

    return nodes;
  };

	return (
    <div className="h-full min-h-0 flex border border-gray-200 rounded-md overflow-hidden bg-white">
      <div
        className="border-r border-gray-200 bg-gray-50 overflow-y-auto"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">
          Files
        </div>
        <div className="py-2">{renderDir('')}</div>
      </div>

      <div
        className="w-1 cursor-col-resize bg-gray-100 hover:bg-blue-300 transition-colors"
        onMouseDown={(e: ReactMouseEvent<HTMLDivElement>) => {
          resizeStartXRef.current = e.clientX;
          resizeStartWidthRef.current = sidebarWidth;
          setIsResizingSidebar(true);
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col bg-white">
        <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200 font-mono">
          {currentPath || '/ (root)'}
        </div>

        {currentPath && fileContent !== null ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 flex items-center justify-between">
            <div className="flex items-center">
              <FileText size={16} className="mr-2" />
              {currentPath.split('/').pop()}
            </div>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setDraftContent(fileContent);
                  setCommitError(null);
                }}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Edit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setDraftContent(fileContent);
                  setCommitError(null);
                }}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="bg-white p-4 space-y-3">
              <textarea
                className="w-full min-h-[360px] border border-gray-300 rounded-md p-3 font-mono text-sm"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />

              {commitError && <div className="text-sm text-red-600">{commitError}</div>}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isCommitting || !commitMessage.trim()}
                  onClick={handleCommitChanges}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-black disabled:opacity-50"
                >
                  {isCommitting ? 'Committing...' : 'Commit Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 overflow-auto">
              <pre className="text-sm font-mono text-gray-800 leading-relaxed">
                <code>{fileContent}</code>
              </pre>
            </div>
          )}
        </div>
        ) : fileLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Loading file...</div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a file from the sidebar to view its content.
          </div>
        )}
      </div>
    </div>
	);
}
