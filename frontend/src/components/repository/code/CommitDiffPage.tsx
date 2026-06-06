import { useEffect, useState } from "react";
import { reposApi } from "../../../services/api/repos";
import type { Commit } from "../../../types";
import CommitMetadataSection from "./CommitMetadataSection";
import CommitDiffFileBrowserSection from "./CommitDiffFileBrowserSection";
import CommitDiffSection from "./CommitDiffSection";

interface CommitDiffPageProps {
  repoId: string;
  commitHash: string;
  repoOwner: string;
  repoName: string;
  onBrowseFiles?: (commitHash: string) => void;
}

interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  patch: string;
}

export default function CommitDiffPage({ repoId, commitHash, onBrowseFiles }: CommitDiffPageProps) {
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

  const totalAdditions = diff.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = diff.reduce((s, f) => s + f.deletions, 0);

  if (loading) {
    return <div className="py-12 text-center text-sm text-[var(--text-secondary)]">Loading commit...</div>;
  }

  if (error) {
    return <div className="py-12 text-center text-sm text-[var(--text-secondary)]">{error}</div>;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <CommitMetadataSection
        commit={commit}
        commitHash={commitHash}
        fileCount={diff.length}
        totalAdditions={totalAdditions}
        totalDeletions={totalDeletions}
        onBrowseFiles={onBrowseFiles}
      />
      <div className="flex items-stretch flex-1 min-h-0">
        <CommitDiffFileBrowserSection diff={diff} />
        <CommitDiffSection diff={diff} />
      </div>
    </div>
  );
}
