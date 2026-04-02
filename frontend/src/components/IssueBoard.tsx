import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, CircleDot, Plus, UserPlus, XCircle } from 'lucide-react';
import { issuesApi } from '../services/api';
import type { Issue, IssueStatus } from '../types';

interface IssueBoardProps {
  repoId: string;
}

export default function IssueBoard({ repoId }: IssueBoardProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const [listLoading, setListLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [creatingIssue, setCreatingIssue] = useState<boolean>(false);
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [assigneeUpdating, setAssigneeUpdating] = useState<boolean>(false);

  const [createTitle, setCreateTitle] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [assigneeUserId, setAssigneeUserId] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadIssues = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) {
        setListLoading(true);
      }
      setError(null);
      const data = await issuesApi.list(repoId);
      const nextIssues = data || [];
      setIssues(nextIssues);

      setSelectedIssueId((prev) => {
        if (prev && nextIssues.some((issue) => issue.id === prev)) {
          return prev;
        }

        return nextIssues[0]?.id ?? null;
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load issues';
      setError(errMsg);
    } finally {
      if (!silent) {
        setListLoading(false);
      }
    }
  }, [repoId]);

  const loadIssueDetail = useCallback(async (issueId: string) => {
    try {
      setDetailLoading(true);
      const issue = await issuesApi.get(repoId, issueId);
      setSelectedIssue(issue);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load issue detail';
      setError(errMsg);
    } finally {
      setDetailLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    setIssues([]);
    setSelectedIssueId(null);
    setSelectedIssue(null);
    setError(null);
    setMessage(null);
    setCreateTitle('');
    setCreateDescription('');
    setAssigneeUserId('');
    void loadIssues();
  }, [repoId, loadIssues]);

  useEffect(() => {
    if (!selectedIssueId) {
      setSelectedIssue(null);
      return;
    }

    void loadIssueDetail(selectedIssueId);
  }, [selectedIssueId, loadIssueDetail]);

  const handleCreateIssue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!createTitle.trim()) return;

    try {
      setCreatingIssue(true);
      setError(null);
      setMessage(null);

      const createdIssue = await issuesApi.create(repoId, {
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
      });

      setCreateTitle('');
      setCreateDescription('');
      setMessage('Issue created successfully.');

      await loadIssues(true);
      setSelectedIssueId(createdIssue.id);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create issue';
      setError(errMsg);
    } finally {
      setCreatingIssue(false);
    }
  };

  const handleToggleIssueStatus = async () => {
    if (!selectedIssue) return;

    const nextStatus: IssueStatus = selectedIssue.status === 'OPEN' ? 'CLOSED' : 'OPEN';

    try {
      setStatusUpdating(true);
      setError(null);
      setMessage(null);

      await issuesApi.updateStatus(repoId, selectedIssue.id, { status: nextStatus });
      await loadIssues(true);
      await loadIssueDetail(selectedIssue.id);

      setMessage(`Issue marked as ${nextStatus}.`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update issue status';
      setError(errMsg);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssignIssue = async () => {
    if (!selectedIssue || !assigneeUserId.trim()) return;

    try {
      setAssigneeUpdating(true);
      setError(null);
      setMessage(null);

      await issuesApi.assign(repoId, selectedIssue.id, { user_id: assigneeUserId.trim() });
      await loadIssueDetail(selectedIssue.id);
      setAssigneeUserId('');
      setMessage('Assignee added successfully.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to assign issue';
      setError(errMsg);
    } finally {
      setAssigneeUpdating(false);
    }
  };

  const handleUnassignIssue = async (userId: string) => {
    if (!selectedIssue) return;

    try {
      setAssigneeUpdating(true);
      setError(null);
      setMessage(null);

      await issuesApi.unassign(repoId, selectedIssue.id, userId);
      await loadIssueDetail(selectedIssue.id);
      setMessage('Assignee removed successfully.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to unassign issue';
      setError(errMsg);
    } finally {
      setAssigneeUpdating(false);
    }
  };

  return (
    <div className="flex h-full border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="w-96 border-r border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 bg-gray-100">
          <div className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <CircleDot size={18} />
            Issues
          </div>

          <form onSubmit={handleCreateIssue} className="flex flex-col gap-2">
            <input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Issue title"
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
              required
            />
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Description (optional)"
              className="px-3 py-2 text-sm border border-gray-300 rounded-md min-h-20 bg-white"
            />
            <button
              type="submit"
              disabled={creatingIssue || !createTitle.trim()}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-black disabled:opacity-50"
            >
              <Plus size={16} />
              {creatingIssue ? 'Creating...' : 'Create Issue'}
            </button>
          </form>
        </div>

        {listLoading ? (
          <div className="p-4 text-sm text-gray-500">Loading issues...</div>
        ) : issues.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No issues found.</div>
        ) : (
          <ul>
            {issues.map((issue) => (
              <li key={issue.id}>
                <button
                  type="button"
                  onClick={() => setSelectedIssueId(issue.id)}
                  className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-100 transition-colors ${
                    selectedIssueId === issue.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900 truncate">{issue.title}</div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        issue.status === 'OPEN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {issue.status}
                    </span>
                    <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col bg-white overflow-y-auto">
        {error && (
          <div className="m-4 mb-0 p-3 text-sm border border-red-200 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {message && (
          <div className="m-4 mb-0 p-3 text-sm border border-blue-200 bg-blue-50 text-blue-700 rounded-md">
            {message}
          </div>
        )}

        {!selectedIssueId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 p-8 text-center">
            Select an issue from the list to view details.
          </div>
        ) : detailLoading || !selectedIssue ? (
          <div className="p-6 text-sm text-gray-500">Loading issue detail...</div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">{selectedIssue.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    selectedIssue.status === 'OPEN'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {selectedIssue.status}
                </span>
                <span>Created: {new Date(selectedIssue.created_at).toLocaleString()}</span>
                <span>Updated: {new Date(selectedIssue.updated_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
              {selectedIssue.description || 'No description provided.'}
            </div>

            <div>
              <button
                type="button"
                onClick={handleToggleIssueStatus}
                disabled={statusUpdating}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 ${
                  selectedIssue.status === 'OPEN'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {selectedIssue.status === 'OPEN' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                {statusUpdating
                  ? 'Updating...'
                  : selectedIssue.status === 'OPEN'
                    ? 'Close Issue'
                    : 'Reopen Issue'}
              </button>
            </div>

            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Assignees</h3>

              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  value={assigneeUserId}
                  onChange={(e) => setAssigneeUserId(e.target.value)}
                  placeholder="Collaborator user_id (UUID)"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={handleAssignIssue}
                  disabled={assigneeUpdating || !assigneeUserId.trim()}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-black disabled:opacity-50"
                >
                  <UserPlus size={16} />
                  Assign
                </button>
              </div>

              {(selectedIssue.assignees || []).length === 0 ? (
                <p className="text-sm text-gray-500">No assignees yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(selectedIssue.assignees || []).map((assignee) => (
                    <li
                      key={assignee.user_id}
                      className="flex items-center justify-between gap-2 text-sm border border-gray-200 rounded-md px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-gray-800 truncate">{assignee.user_id}</p>
                        <p className="text-xs text-gray-500">
                          Assigned {new Date(assignee.assigned_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleUnassignIssue(assignee.user_id)}
                        disabled={assigneeUpdating}
                        className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
