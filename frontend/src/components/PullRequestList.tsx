import { useEffect, useState, type FormEvent } from "react";
import type { Branch, PullRequest } from "../types";
import { pullsApi } from "../services/api/pull";
import { AlertCircle, CheckCircle, Clock, GitMerge, GitPullRequest } from "lucide-react";
import ConflictResolver from "./ConflictResolver";

interface PullRequestListProps {
  repoId: string;
  branches: Branch[];
  defaultSourceBranch: string;
}

export default function PullRequestList({ repoId, branches, defaultSourceBranch }: PullRequestListProps) {
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [prSourceBranch, setPrSourceBranch] = useState('');
  const [prTargetBranch, setPrTargetBranch] = useState('');

  const fetchPulls = async () => {
    try {
      setLoading(true);
      const data = await pullsApi.list(repoId);
      const pullsData = Array.isArray(data) ? data : [];
      setPulls(pullsData);

      // If we had a selected PR, update its status
      if (selectedPR) {
        const updatedPR = pullsData.find((p) => p.id === selectedPR.id);
        if (updatedPR) setSelectedPR(updatedPR);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pull requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulls();
    setSelectedPR(null);
    setIsResolving(false);
    setIsCreatingPR(false);
  }, [repoId]);

  useEffect(() => {
    if (branches.length === 0) {
      setPrSourceBranch('');
      setPrTargetBranch('');
      return;
    }

    const defaultSource = defaultSourceBranch && branches.some((b) => b.name === defaultSourceBranch)
      ? defaultSourceBranch
      : branches[0].name;
    const defaultTarget = branches.find((b) => b.is_default)?.name || branches[0].name;

    setPrSourceBranch(defaultSource);
    setPrTargetBranch(defaultTarget);
  }, [branches, defaultSourceBranch, repoId]);

  const handleMerge = async () => {
    if (!selectedPR) return;
    try {
      await pullsApi.merge(repoId, selectedPR.id);
      alert('Merged successful!');
      fetchPulls(); // Refresh the list to update statuses
    } catch (err: any) {
      if (err.message.includes('conflict')) {
        alert('Merge conflict detected. Please resolve conflicts manually.');
        setIsResolving(true);
      } else {
        alert(`Merge failed: ${err.message}`);
      }
    }
  };

  const handleCreatePR = async (e: FormEvent) => {
    e.preventDefault();
    if (!prTitle.trim() || !prSourceBranch || !prTargetBranch) return;

    if (prSourceBranch === prTargetBranch) {
      setError('Source and target branches must be different');
      return;
    }

    try {
      setCreatingPR(true);
      setError(null);

      await pullsApi.create(repoId, {
        title: prTitle.trim(),
        description: prDescription.trim(),
        source_branch: prSourceBranch,
        target_branch: prTargetBranch,
      });

      setPrTitle('');
      setPrDescription('');
      setIsCreatingPR(false);
      fetchPulls();
    } catch (err: any) {
      setError(err.message || 'Failed to create pull request');
    } finally {
      setCreatingPR(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading pull requests...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="flex h-full border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Left List Pane */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 bg-gray-100">
          <div className="font-semibold text-gray-700 flex items-center gap-2">
            <GitPullRequest size={18} />
            Pull Requests
          </div>
          <button
            onClick={() => {
              setIsCreatingPR((prev) => !prev);
              setError(null);
            }}
            className="mt-3 w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {isCreatingPR ? 'Cancel' : 'Create Pull Request'}
          </button>

          {isCreatingPR && (
            <form onSubmit={handleCreatePR} className="mt-3 flex flex-col gap-2">
              <input
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="PR title"
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                required
              />
              <textarea
                value={prDescription}
                onChange={(e) => setPrDescription(e.target.value)}
                placeholder="Description (optional)"
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md min-h-20"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={prSourceBranch}
                  onChange={(e) => setPrSourceBranch(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                >
                  {branches.map((b) => (
                    <option key={`source-${b.name}`} value={b.name}>{b.name}</option>
                  ))}
                </select>
                <select
                  value={prTargetBranch}
                  onChange={(e) => setPrTargetBranch(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                >
                  {branches.map((b) => (
                    <option key={`target-${b.name}`} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={creatingPR || branches.length < 2}
                className="px-3 py-1.5 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900 disabled:opacity-50"
              >
                {creatingPR ? 'Creating...' : 'Create PR'}
              </button>
            </form>
          )}
        </div>
        {pulls.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No pull requests found.</div>
        ) : (
          pulls.map(pr => (
            <button
              key={pr.id}
              onClick={() => {
                setSelectedPR(pr);
                setIsResolving(false);
              }}
              className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-100 transition-colors ${
                selectedPR?.id === pr.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="font-medium text-gray-900 truncate">{pr.title}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  pr.status === 'OPEN' ? 'bg-green-100 text-green-700' : 
                  pr.status === 'MERGED' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'
                }`}>
                  {pr.status}
                </span>
                <span>{pr.source_branch} → {pr.target_branch}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Right Details Pane */}
      <div className="w-2/3 flex flex-col bg-white overflow-y-auto">
        {!selectedPR ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 p-8 text-center">
            Select a pull request from the list to view details or resolve conflicts.
          </div>
        ) : isResolving ? (
          <div className="p-4 h-full">
            <button 
              onClick={() => setIsResolving(false)}
              className="mb-4 text-sm text-blue-600 hover:underline"
            >
              ← Back to PR Details
            </button>
            <ConflictResolver 
              repoId={repoId} 
              pullId={selectedPR.id} 
              onResolved={() => {
                setIsResolving(false);
                fetchPulls();
              }} 
            />
          </div>
        ) : (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedPR.title}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center gap-1">
                <GitPullRequest size={16} />
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{selectedPR.source_branch}</span>
                <span>into</span>
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{selectedPR.target_branch}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={16} />
                {new Date(selectedPR.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="prose text-gray-700 mb-8 max-w-none">
              {selectedPR.description || <span className="italic text-gray-400">No description provided.</span>}
            </div>

            {selectedPR.status === 'OPEN' && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <button
                  onClick={handleMerge}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
                >
                  <GitMerge size={18} />
                  Merge Pull Request
                </button>
                <button
                  onClick={() => setIsResolving(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 border border-amber-300 rounded hover:bg-amber-200 transition-colors font-medium"
                >
                  <AlertCircle size={18} />
                  Resolve Conflicts
                </button>
              </div>
            )}
            
            {selectedPR.status === 'MERGED' && (
              <div className="flex items-center gap-2 p-4 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg font-medium">
                <CheckCircle size={20} />
                This pull request has been merged.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
