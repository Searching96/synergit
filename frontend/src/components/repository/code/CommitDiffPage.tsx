import { useEffect, useState } from "react";
import { reposApi } from "../../../services/api/repos";
import type { Commit } from "../../../types";

interface CommitDiffPageProps {
  repoId: string;
  commitHash: string;
  repoOwner: string;
  repoName: string;
}

interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  patch: string;
}

export default function CommitDiffPage({ repoId, commitHash }: CommitDiffPageProps) {
  const [commit, setCommit] = useState<Commit | null>(null);
  const [diff, setDiff] = useState<DiffFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      reposApi.getCommitDetail(repoId, commitHash),
      reposApi.getCommitDiff(repoId, commitHash),
    ])
      .then(([commitData, diffData]) => {
        if (cancelled) return;
        setCommit(commitData);
        setDiff(diffData);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load commit");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [repoId, commitHash]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-[var(--text-secondary)]">Loading commit...</div>;
  }

  if (error) {
    return <div className="py-12 text-center text-sm text-[var(--text-secondary)]">{error}</div>;
  }

  const shortHash = commitHash.slice(0, 7);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-mono font-semibold text-[var(--text-primary)]">
          Commit {shortHash}
        </h1>
        {commit && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">{commit.author}</span> committed on{" "}
            {new Date(commit.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      {commit && (
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-primary)] font-mono">
          {commit.message}
        </div>
      )}

      <p className="text-sm text-[var(--text-secondary)]">
        {diff.length} file{diff.length !== 1 ? "s" : ""} changed
      </p>

      {diff.map((file) => (
        <div key={file.path} className="border border-[var(--border-default)] rounded-md overflow-hidden">
          <div className="px-4 py-2 bg-[var(--surface-subtle)] border-b border-[var(--border-default)] flex items-center justify-between">
            <span className="text-sm font-mono text-[var(--text-primary)]">{file.path}</span>
            <span className="text-xs text-[var(--text-secondary)]">
              <span className="text-green-600">+{file.additions}</span>{" "}
              <span className="text-red-600">-{file.deletions}</span>
            </span>
          </div>
          {file.patch ? (
            <pre className="px-4 py-3 text-xs font-mono text-[var(--text-primary)] overflow-x-auto whitespace-pre bg-[var(--surface-canvas)]">
              {file.patch.split("\n").map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("+") ? "bg-green-50 text-green-800" :
                    line.startsWith("-") ? "bg-red-50 text-red-800" :
                    line.startsWith("@@") ? "text-[var(--text-link)] bg-blue-50" : ""
                  }
                >
                  {line}
                </div>
              ))}
            </pre>
          ) : (
            <p className="px-4 py-3 text-xs text-[var(--text-secondary)]">Binary file or no diff available</p>
          )}
        </div>
      ))}
    </div>
  );
}
