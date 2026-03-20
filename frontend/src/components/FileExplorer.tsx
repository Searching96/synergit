import { useEffect, useState } from "react";
import type { RepoFile } from "../types";
import { ArrowLeft, FileText, Folder } from "lucide-react";
import { api } from "../services/api";

interface FileExplorerProps {
	repoName: string;
}

export default function FileExplorer({ repoName }: FileExplorerProps) {
	const [tree, setTree] = useState<RepoFile[]>([]);
	const [currentPath, setCurrentPath] = useState<string>('');
	const [fileContent, setFileContent] = useState<string | null>(null);

	// Load root on mount or repo change
	useEffect(() => {
		loadTree('');
	}, [repoName])

	const loadTree = (path: string) => {
		setCurrentPath(path);
		setFileContent(null);
    api.getTree(repoName, path)
			.then((data) => setTree(data || []))
			.catch(console.error);
	};

	const loadBlob = (path: string) => {
		setCurrentPath(path);
    api.getBlob(repoName, path)
			.then((data) => {
				const textToDisplay = typeof data === 'string' ? data : data.content;
				setFileContent(textToDisplay);
			})
			.catch(console.error);
	}

	const handleItemClick = (item: RepoFile) => {
		if (item.type === 'dir') {
			loadTree(item.path);
		} else {
			loadBlob(item.path);
		}
	};

	const goBack = () => {
		const pathParts = currentPath.split('/')
		pathParts.pop();
		loadTree(pathParts.join('/'));
	}

	return (
    <div>
      {/* Breadcrumb / Back Navigation */}
      <div className="flex items-center mb-4">
        {currentPath !== '' && (
          <button onClick={goBack} className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm mr-4">
            <ArrowLeft size={16} className="mr-2" /> Back
          </button>
        )}
        <span className="text-gray-600 font-mono text-sm">{currentPath || '/ (root)'}</span>
      </div>

      {/* Content Viewer */}
      {fileContent !== null ? (
        <div className="border border-gray-200 rounded-md shadow-sm overflow-hidden">
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
        <div className="border border-gray-200 rounded-md shadow-sm">
          {tree.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm bg-gray-50 rounded-md">This folder is empty.</div>
          ) : (
            <ul className="divide-y divide-gray-200 bg-white rounded-md">
              {[...tree].sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'dir' ? -1 : 1;
              }).map((item) => (
                <li key={item.path} onClick={() => handleItemClick(item)} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center text-sm transition-colors group">
                  {item.type === 'dir' ? <Folder size={18} className="mr-3 text-blue-400 fill-blue-100" /> : <FileText size={18} className="mr-3 text-gray-400" />}
                  <span className="text-gray-700 group-hover:text-blue-600">{item.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}