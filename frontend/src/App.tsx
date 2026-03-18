import { useEffect, useState } from "react";
import type { RepoFile, Repository } from "./types";
import { ArrowLeft, BookOpen, FileText, Folder } from "lucide-react";

function App () {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [tree, setTree] = useState<RepoFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [fileContent, setFileContent] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:8080/api/v1/repos')
      .then((res) => res.json())
      .then((data) => {
        setRepos(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  const loadTree = (repoName: string, path: string = '') => {
    setSelectedRepo(repoName);
    setCurrentPath(path);
    setFileContent(null);

    fetch(`http://localhost:8080/api/v1/repos/${repoName}/tree?path=${path}`)
      .then((res) => res.json())
      .then((data) => setTree(data || []))
      .catch(console.error);
  };

  const loadBlob = (repoName: string, path: string = '') => {
    fetch(`http://localhost:8080/api/v1/repos/${repoName}/blob?path=${path}`)
      .then((res) => res.json())
      .then((data) => {
        // Backend may return a plain JSON string or an object with a content field.
        const content = typeof data === 'string' ? data : data?.content ?? '';
        setFileContent(content);
      })
      .catch(console.error);
  }

  const handleItemClick = (item: RepoFile) => {
    if (!selectedRepo) return;

    // Update the header
    setCurrentPath(item.path)

    if (item.type === 'dir') {
      loadTree(selectedRepo, item.path)
    } else {
      loadBlob(selectedRepo, item.path)
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900">
      {/* Sidebar */}
      <div className="w-72 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold mb-4 text-gray-600 uppercase tracking-wider">Repository</h3>
        <ul className="space-y-1">
          {repos.map((repo) => (
            <li
              key={repo.id}
              onClick={() => loadTree(repo.name)}
              className={`flex items-center p-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                selectedRepo === repo.name ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen size={16} className="mr-2 text-gray-500" />
              {repo.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {!selectedRepo ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <h2 className="text-xl font-medium">Select a repository to view its content </h2>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <BookOpen size={24} className="mr-3 text-gray-400" />
                <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => loadTree(selectedRepo, '')}>
                  {selectedRepo}
                </span>
                {currentPath && (
                  <>
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-600">{currentPath}</span>
                  </>
                )}
              </h2>
            </div>

            {/* Back Button */}
            {currentPath !== '' && (
              <button
                onClick={() => {
                  // Simple logic to go up one directory
                  const pathParts = currentPath.split('/');
                  pathParts.pop();
                  loadTree(selectedRepo, pathParts.join('/'));
                }}
                className="mb-4 flex items-center px-3 py-1.5 bg-white border border-gray-300 round-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back
              </button>
            )}

            {/* File Viewer or File Tree */}
            {fileContent !== null ? (
              <div className="border bg-gray-200 rounded-md shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 flex items-center">
                  <FileText size={16} className="mr-2" />
                  {currentPath.split('/').pop()}
                </div>
                <div className="bg-white p-4 overflow-x-auto">
                  <pre className="text-sm font-mono text-gray-800 leading-relaxed">
                    <code>{fileContent}</code>
                  </pre>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 bg-white rounded-md">
                {/* Sort to put directories first, then files */}
                {[...tree].sort((a, b) => {
                  if (a.type === b.type) return a.name.localeCompare(b.name);
                  return a.type === 'dir' ? -1 : 1;
                }).map((item) => (
                  <li
                    key={item.path}
                    onClick={() => handleItemClick(item)}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center text-sm transition-colors group"
                  >
                    {item.type === 'dir' ? (
                      <Folder size={18} className="mr-3 text-blue-400 fill-blue-100" />
                    ) :(
                      <FileText size={18} className="mr-3 text-gray-400" />
                    )}
                    <span className="text-gray-700 group-hover:text-blue-600 transition-colors">{item.name}</span>
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

export default App;