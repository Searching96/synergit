import { useEffect, useState } from "react";
import type { Branch, Repository } from "./types/index";
import { BookOpen, Code, GitBranch, History} from "lucide-react";
import FileExplorer from "./components/FileExplorer";
import CommitHistory from "./components/CommitHistory";
import { reposApi } from "./services/api";
import Auth from "./components/Auth";

function App () {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'commits'>('files');

  const [branches, setBranches] = useState<Branch[]>([])
  const [currentBranch, setCurrentBranch] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated) {
      reposApi.getRepos()
        .then((data) => setRepos(data || [])) // Just to ensure handling null value for data 
                                              // since we do not know the backend will handle empty list or not
        .catch((err) => {
          console.error(err);
          // If token is invalid/expired, log out
          if (err.message.includes('token') || err.message.includes('Unauthorized')) {
            handleLogout();
          }
        });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedRepoId && isAuthenticated) {
      reposApi.getBranches(selectedRepoId)
        .then((data) => {
          setBranches(data || []);
          const defaultBranch = data?.find(b => b.is_default)?.name || data?.[0]?.name || ''; 
          setCurrentBranch(defaultBranch);
        })
        .catch(console.error)
    }
  }, [selectedRepoId, isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setSelectedRepoId(null);
  };

  const selectedRepo = repos.find((repo) => repo.id === selectedRepoId) || null;

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

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
                setSelectedRepoId(repo.id);
                setActiveTab('files');
              }}
              className={`flex items-center p-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                selectedRepoId === repo.id ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
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
              <div className="flex flex-col">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                  <BookOpen size={24} className="mr-3 text-gray-400" />
                  {selectedRepo.name}
                </h2>

                {/* Navigation among branches */}
                {branches.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md w-fit mb-1">
                    <GitBranch size={16} className="mr-2 text-gray-500" />
                    <select
                      value={currentBranch}
                      onChange={(e) => setCurrentBranch(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 cursor-pointer font-medium outline-none"
                    >
                      {branches.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Navigation between files and commits */}
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
              <FileExplorer repoId={selectedRepo.id} branch={currentBranch} />
            ) : (
              <CommitHistory repoId={selectedRepo.id} branch={currentBranch}/>
            )}

          </div>
       )}
      </div>
    </div>
  );
}

export default App;