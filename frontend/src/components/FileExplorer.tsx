import { useCallback, useEffect, useMemo, useState } from "react";
import type { RepoFile } from "../types";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { reposApi } from "../services/api";

interface FileExplorerProps {
  repoId: string;
  branch: string;
}

export default function FileExplorer({ repoId, branch }: FileExplorerProps) {
	const [entriesByPath, setEntriesByPath] = useState<Record<string, RepoFile[]>>({});
	const [currentDirPath, setCurrentDirPath] = useState<string>('');
	const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
	const [fileContent, setFileContent] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [dirLoading, setDirLoading] = useState<boolean>(true);
  const [fileLoading, setFileLoading] = useState<boolean>(false);

	const loadDir = useCallback(async (path: string) => {
		try {
      setDirLoading(true);
      const data = await reposApi.getTree(repoId, path, branch);
      setEntriesByPath((prev) => ({ ...prev, [path]: data || [] }));
    } catch (err) {
      console.error(err);
    } finally {
      setDirLoading(false);
    }
	}, [repoId, branch]);

	const loadBlob = useCallback(async (path: string) => {
    setCommitError(null);
    setFileLoading(true);
    try {
      const data = await reposApi.getBlob(repoId, path, branch);
      const textToDisplay = typeof data === 'string' ? data : data.content;
      setFileContent(textToDisplay);
      setDraftContent(textToDisplay);
      setIsEditing(false);
      setSelectedFilePath(path);
    } catch (err) {
      console.error(err);
    } finally {
      setFileLoading(false);
    }
	}, [repoId, branch]);

	useEffect(() => {
    setEntriesByPath({});
    setCurrentDirPath('');
    setSelectedFilePath(null);
    setFileContent(null);
    setIsEditing(false);
    setDraftContent('');
    setCommitMessage('');
    setCommitError(null);
    void loadDir('');
  }, [repoId, branch, loadDir]);

  const handleCommitChanges = async () => {
    if (!selectedFilePath || fileContent === null || !commitMessage.trim()) return;

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
      setCommitMessage('');
    } catch (err: unknown) {
      setCommitError(err instanceof Error ? err.message : 'Failed to commit changes');
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

	const openDirectory = (path: string) => {
    setCurrentDirPath(path);
    setSelectedFilePath(null);
    setFileContent(null);
    setCommitError(null);
    setIsEditing(false);

    if (!entriesByPath[path]) {
      void loadDir(path);
    }
	};

	const openFile = (path: string) => {
    void loadBlob(path);
	};

  const currentEntries = useMemo(() => {
    const entries = entriesByPath[currentDirPath] || [];
    return [...entries].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'DIR' ? -1 : 1;
    });
  }, [entriesByPath, currentDirPath]);

  const getParentPath = (path: string) => {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
  };

  const directoryParts = currentDirPath.split('/').filter(Boolean);

  const fileParts = (selectedFilePath || '').split('/').filter(Boolean);

	return (
    <div className="h-full min-h-0 flex flex-col border border-gray-200 rounded-md overflow-hidden bg-white">
      <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200 bg-gray-50 flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => openDirectory('')}
          className="font-medium hover:text-gray-900"
        >
          root
        </button>

        {selectedFilePath
          ? fileParts.map((part, index) => (
              <span key={`${part}-${index}`} className="flex items-center gap-1">
                <ChevronRight size={14} className="text-gray-400" />
                <span className="font-mono text-gray-700">{part}</span>
              </span>
            ))
          : directoryParts.map((part, index) => {
              const partialPath = directoryParts.slice(0, index + 1).join('/');
              return (
                <span key={`${part}-${index}`} className="flex items-center gap-1">
                  <ChevronRight size={14} className="text-gray-400" />
                  <button
                    type="button"
                    onClick={() => openDirectory(partialPath)}
                    className="font-mono hover:text-gray-900"
                  >
                    {part}
                  </button>
                </span>
              );
            })}
      </div>

      <div className="flex-1 min-w-0 flex flex-col bg-white overflow-auto">
        {selectedFilePath ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 flex items-center justify-between">
            <div className="flex items-center">
              <FileText size={16} className="mr-2" />
              {selectedFilePath.split('/').pop()}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedFilePath(null);
                  setFileContent(null);
                  setIsEditing(false);
                  setCommitError(null);
                }}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Back to folder
              </button>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setDraftContent(fileContent || '');
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
                    setDraftContent(fileContent || '');
                    setCommitError(null);
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {fileLoading ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Loading file...</div>
          ) : isEditing ? (
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
                <code>{fileContent || ''}</code>
              </pre>
            </div>
          )}
        </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="px-4 py-3 border-b border-gray-200 text-sm font-medium text-gray-700 flex items-center gap-2">
              <FolderOpen size={16} className="text-gray-500" />
              {currentDirPath || '/'}
            </div>

            {dirLoading && currentEntries.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">Loading directory...</div>
            ) : currentEntries.length === 0 && currentDirPath === '' ? (
              <div className="p-6 text-sm text-gray-500">Repository is empty.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {currentDirPath !== '' && (
                  <li>
                    <button
                      type="button"
                      onClick={() => openDirectory(getParentPath(currentDirPath))}
                      className="w-full px-4 py-3 text-sm flex items-center gap-3 hover:bg-gray-50 text-gray-700"
                    >
                      <Folder size={16} className="text-gray-500" />
                      ..
                    </button>
                  </li>
                )}

                {currentEntries.map((item) => (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => item.type === 'DIR' ? openDirectory(item.path) : openFile(item.path)}
                      className="w-full px-4 py-3 text-sm flex items-center justify-between gap-3 hover:bg-gray-50"
                    >
                      <span className="min-w-0 flex items-center gap-3">
                        {item.type === 'DIR' ? (
                          <Folder size={16} className="text-gray-500 shrink-0" />
                        ) : (
                          <FileText size={16} className="text-gray-400 shrink-0" />
                        )}
                        <span className="truncate text-gray-800">{item.name}</span>
                      </span>
                      <span className="text-xs text-gray-500 shrink-0">{item.type === 'DIR' ? 'Folder' : 'File'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
	);
}
