import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, CircleDot, GitMerge, GitPullRequest, Settings2 } from "lucide-react";
import type { Issue, PullRequest, RepoInsightsSnapshot } from "../../../types";
import { issuesApi, reposApi } from "../../../services/api";
import { pullsApi } from "../../../services/api/pull";

interface RepoInsightsProps {
  repoId: string;
}

export default function RepoInsights({ repoId }: RepoInsightsProps) {
  const [snapshot, setSnapshot] = useState<RepoInsightsSnapshot | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const [insightData, issueData, pullData] = await Promise.all([
        reposApi.getInsights(repoId),
        issuesApi.list(repoId),
        pullsApi.list(repoId),
      ]);

      setSnapshot(insightData);
      setIssues(issueData || []);
      setPulls(pullData || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load insights";
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
      void loadInsights(true);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadInsights]);

  const commitTotal = useMemo(
    () => snapshot?.commit_trend.reduce((sum, item) => sum + item.commit_count, 0) || 0,
    [snapshot],
  );

  const openPulls = useMemo(() => pulls.filter((pull) => pull.status === "OPEN").length, [pulls]);
  const mergedPulls = useMemo(() => pulls.filter((pull) => pull.status === "MERGED").length, [pulls]);
  const openIssues = useMemo(() => issues.filter((issue) => issue.status === "OPEN").length, [issues]);
  const closedIssues = useMemo(() => issues.filter((issue) => issue.status === "CLOSED").length, [issues]);

  const recentIssues = useMemo(
    () => [...issues].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 5),
    [issues],
  );

  const maxContributorCommits = useMemo(() => {
    if (!snapshot || snapshot.top_contributors.length === 0) return 1;
    return Math.max(...snapshot.top_contributors.map((item) => item.commit_count), 1);
  }, [snapshot]);

  const totalOpenItems = Math.max(openPulls + openIssues, 1);

  const toRelativeTime = (timestamp: string) => {
    const diffMinutes = Math.floor((Date.now() - Date.parse(timestamp)) / 60000);
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  };

  if (loading) {
    return <div className="p-8 text-center text-[#57606a]">Loading insights...</div>;
  }

  if (error) {
    return (
      <div className="p-6 border border-[#ff818266] bg-[#ffebe9] text-[#cf222e] rounded-md space-y-3">
        <p className="font-medium">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            void loadInsights();
          }}
          className="px-3 py-1.5 text-sm rounded-md border border-[#f7c6c7] bg-white hover:bg-[#ffebe9]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return <div className="p-8 text-center text-[#57606a]">No insights available.</div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-4">
      <aside className="border border-[#d8dee4] rounded-md bg-white py-2 h-fit">
        {[
          "Pulse",
          "Contributors",
          "Community",
          "Community standards",
          "Traffic",
          "Commits",
          "Code frequency",
          "Dependency graph",
          "Network",
          "Forks",
          "Actions usage metrics",
          "Actions performance metrics",
        ].map((item, index) => (
          <button
            key={item}
            type="button"
            className={`w-full px-4 py-2 text-left text-sm ${
              index === 0
                ? "text-[#24292f] bg-[#f6f8fa] border-l-2 border-[#fd8c73] font-semibold"
                : "text-[#57606a] hover:bg-[#f6f8fa]"
            }`}
          >
            {item}
          </button>
        ))}
      </aside>

      <section className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[40px] leading-[1.2] font-semibold text-[#24292f]">
            {new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString()} - {new Date().toLocaleDateString()}
          </h2>
          <button
            type="button"
            onClick={() => void loadInsights()}
            className="h-9 px-3 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-sm text-[#24292f] hover:bg-[#eef1f4] inline-flex items-center gap-2"
          >
            <Calendar size={14} />
            Period: 1 week
          </button>
        </div>

        <div className="border border-[#d8dee4] rounded-md bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#d8dee4] text-base font-semibold text-[#24292f]">Overview</div>

          <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="h-2 rounded bg-[#eaeef2] overflow-hidden">
                <div
                  className="h-full bg-[#8c959f]"
                  style={{ width: `${Math.round((openPulls / totalOpenItems) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-base text-[#24292f]">{openPulls} Active pull requests</p>
            </div>
            <div>
              <div className="h-2 rounded bg-[#eaeef2] overflow-hidden">
                <div
                  className="h-full bg-[#1f883d]"
                  style={{ width: `${Math.round((openIssues / totalOpenItems) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-base text-[#24292f]">{openIssues} Active issues</p>
            </div>
          </div>

          <div className="border-t border-[#d8dee4] grid grid-cols-2 lg:grid-cols-4">
            <div className="px-4 py-4 border-r border-[#d8dee4]">
              <p className="text-2xl font-semibold text-[#8250df] inline-flex items-center gap-2">
                <GitMerge size={18} />
                {mergedPulls}
              </p>
              <p className="text-sm text-[#57606a] mt-1">Merged pull requests</p>
            </div>
            <div className="px-4 py-4 border-r border-[#d8dee4]">
              <p className="text-2xl font-semibold text-[#1f883d] inline-flex items-center gap-2">
                <GitPullRequest size={18} />
                {openPulls}
              </p>
              <p className="text-sm text-[#57606a] mt-1">Open pull requests</p>
            </div>
            <div className="px-4 py-4 border-r border-[#d8dee4]">
              <p className="text-2xl font-semibold text-[#8250df] inline-flex items-center gap-2">
                <CircleDot size={18} />
                {closedIssues}
              </p>
              <p className="text-sm text-[#57606a] mt-1">Closed issues</p>
            </div>
            <div className="px-4 py-4">
              <p className="text-2xl font-semibold text-[#1f883d] inline-flex items-center gap-2">
                <CircleDot size={18} />
                {openIssues}
              </p>
              <p className="text-sm text-[#57606a] mt-1">New issues</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <article className="border border-[#d8dee4] rounded-md bg-white p-4">
            <h3 className="text-lg font-semibold text-[#24292f]">Summary</h3>
            <p className="mt-3 text-lg text-[#57606a] leading-8">
              Excluding merges, {snapshot.top_contributors.length || 1} author has pushed {commitTotal} commits to master and {snapshot.branch_activity.length} branches.
            </p>
            <p className="mt-2 text-lg text-[#57606a] leading-8">
              In the last 30 days, there were <span className="font-semibold text-[#24292f]">{snapshot.commits_last_30d} commits</span> and <span className="font-semibold text-[#24292f]">{openIssues + closedIssues} issues</span> tracked.
            </p>
          </article>

          <article className="border border-[#d8dee4] rounded-md bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-[#24292f]">Top Committers</h3>
              <button type="button" className="h-7 w-7 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] inline-flex items-center justify-center text-[#57606a]">
                <Settings2 size={14} />
              </button>
            </div>

            {snapshot.top_contributors.length === 0 ? (
              <p className="mt-4 text-sm text-[#57606a]">No contributor data yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {snapshot.top_contributors.map((item) => {
                  const width = Math.max(Math.round((item.commit_count / maxContributorCommits) * 100), 6);
                  return (
                    <li key={item.author_name}>
                      <div className="flex items-center justify-between text-sm text-[#57606a]">
                        <span className="truncate pr-3">{item.author_name}</span>
                        <span className="font-semibold text-[#24292f]">{item.commit_count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-[#eaeef2] overflow-hidden">
                        <div className="h-full bg-[#1f883d]" style={{ width: `${width}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        </div>

        <div className="border-t border-[#d8dee4] pt-4">
          <p className="text-xl text-[#57606a] text-center">
            {openIssues} issues opened by {snapshot.top_contributors.length || 1} person
          </p>
          <ul className="mt-4 space-y-3">
            {recentIssues.map((issue) => (
              <li key={issue.id} className="flex items-start gap-2 text-sm">
                <CircleDot size={15} className="text-[#1f883d] mt-0.5" />
                <div>
                  <p className="text-[#24292f] font-semibold">{issue.title}</p>
                  <p className="text-[#57606a]">#{issue.id.slice(0, 6)} opened {toRelativeTime(issue.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}