import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, GitBranch, Users } from 'lucide-react';
import type { RepoInsightsSnapshot } from '../types';
import { reposApi } from '../services/api';

interface RepoInsightsProps {
  repoId: string;
}

export default function RepoInsights({ repoId }: RepoInsightsProps) {
  const [snapshot, setSnapshot] = useState<RepoInsightsSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [queueing, setQueueing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const loadInsights = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const data = await reposApi.getInsights(repoId);
      setSnapshot(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load insights';
      setError(message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [repoId]);

  useEffect(() => {
    void loadInsights();

    const intervalId = window.setInterval(() => {
      void loadInsights({ silent: true });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadInsights]);

  const handleTriggerRecompute = async () => {
    try {
      setQueueing(true);
      setBanner(null);
      await reposApi.triggerInsightsRecompute(repoId, 'manual_frontend');
      setBanner('Recompute queued. Refresh in a few seconds to see updated analytics.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to queue recompute';
      setError(message);
    } finally {
      setQueueing(false);
    }
  };

  const maxTrend = useMemo(() => {
    if (!snapshot || snapshot.commit_trend.length === 0) return 1;
    return Math.max(...snapshot.commit_trend.map((point) => point.commit_count), 1);
  }, [snapshot]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading insights...</div>;
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md space-y-3">
        <p className="font-medium">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            void loadInsights();
          }}
          className="px-3 py-1.5 text-sm rounded-md border border-red-300 bg-white hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return <div className="p-8 text-center text-gray-500">No insights available.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Repository Insights</h3>
          <p className="text-sm text-gray-500">
            Last computed:{' '}
            {snapshot.computed_at ? new Date(snapshot.computed_at).toLocaleString() : 'Not computed yet'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadInsights()}
            className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-100"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleTriggerRecompute()}
            disabled={queueing}
            className="px-3 py-2 text-sm rounded-md bg-gray-900 text-white hover:bg-black disabled:opacity-50"
          >
            {queueing ? 'Queueing...' : 'Recompute'}
          </button>
        </div>
      </div>

      {banner && (
        <div className="px-4 py-3 border border-blue-200 bg-blue-50 text-blue-700 rounded-md text-sm">
          {banner}
        </div>
      )}

      {snapshot.last_error && (
        <div className="px-4 py-3 border border-amber-200 bg-amber-50 text-amber-800 rounded-md text-sm">
          Last analytics error: {snapshot.last_error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Activity size={16} />
            Commits (30d)
          </div>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{snapshot.commits_last_30d}</p>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Users size={16} />
            Contributors
          </div>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{snapshot.top_contributors.length}</p>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <GitBranch size={16} />
            Active Branches
          </div>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{snapshot.branch_activity.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <BarChart3 size={16} />
            Commit Trend
          </div>

          {snapshot.commit_trend.length === 0 ? (
            <p className="text-sm text-gray-500">No commit trend data yet.</p>
          ) : (
            <ul className="space-y-2">
              {snapshot.commit_trend.map((point) => {
                const width = Math.max(Math.round((point.commit_count / maxTrend) * 100), 4);
                return (
                  <li key={point.date} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{point.date}</span>
                      <span>{point.commit_count}</span>
                    </div>
                    <div className="h-2 rounded bg-gray-100 overflow-hidden">
                      <div className="h-full bg-gray-700" style={{ width: `${width}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Top Contributors</h4>
            {snapshot.top_contributors.length === 0 ? (
              <p className="text-sm text-gray-500">No contributor data yet.</p>
            ) : (
              <ul className="space-y-2">
                {snapshot.top_contributors.map((item) => (
                  <li key={item.author_name} className="flex justify-between text-sm">
                    <span className="text-gray-700 truncate pr-3">{item.author_name}</span>
                    <span className="font-medium text-gray-900">{item.commit_count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Branch Activity</h4>
            {snapshot.branch_activity.length === 0 ? (
              <p className="text-sm text-gray-500">No branch activity data yet.</p>
            ) : (
              <ul className="space-y-2">
                {snapshot.branch_activity.map((item) => (
                  <li key={item.branch_name} className="flex justify-between text-sm">
                    <span className="text-gray-700 truncate pr-3">{item.branch_name}</span>
                    <span className="font-medium text-gray-900">{item.commit_count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}