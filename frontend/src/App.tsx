import { useEffect, useState } from "react";
import type { Repository } from "./types/index";
import { BookOpen, Code, History} from "lucide-react";
import FileExplorer from "./components/FileExplorer";
import CommitHistory from "./components/CommitHistory";
import { api } from "./services/api";

function App () {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'commits'>('files');

  useEffect(() => {
    api.getRepos()
      .then((data) => setRepos(data))
      .catch(console.error);
  }, []);

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900">
      {/* Sidebar */}
      <div className="w-72 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold mb-4 text-gray-600 uppercase tracking-wider">Repository</h3>
        <ul className="space-y-1">
          {repos.map((repo) => (
            <li
              key={repo.id}
              onClick={() => {
                setSelectedRepo(repo.name);
                setActiveTab('files');
              }}
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
            {/* Header & Tabs */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <BookOpen size={24} className="mr-3 text-gray-400" />
                {selectedRepo}
              </h2>

              {/* Tab Navigation */}
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'files' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Code size={16} className="mr-2" /> Code
                </button>
                <button
                  onClick={() => setActiveTab('commits')}
                  className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'commits' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <History size={16} className="mr-2" /> Commits
                </button>
              </div>
            </div>

            {/* Dynamic Content Area */}
            {activeTab === 'files' ? (
              <FileExplorer repoName={selectedRepo} />
            ) : (
              <CommitHistory repoName={selectedRepo} />
            )}

          </div>
       )}
      </div>
    </div>
  );
}

export default App;