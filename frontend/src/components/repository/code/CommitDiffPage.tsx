import { useEffect, useMemo, useState } from "react";
import { FileIcon } from "lucide-react";
import { FileDirectoryFillIcon, GitBranchIcon } from "@primer/octicons-react";
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

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildFileTree(files: DiffFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const existing = current.find((n) => n.name === name);
      if (existing) {
        current = existing.children;
      } else {
        const node: TreeNode = { name, path: parts.slice(0, i + 1).join("/"), isDir: !isLast, children: [] };
        current.push(node);
        current = node.children;
      }
    }
  }
  return root;
}

function FileTreeNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  return (
    <>
      <div className="flex items-center gap-1.5 py-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
        {node.isDir ? (
          <FileDirectoryFillIcon size={14} className="text-[#54aeff] shrink-0" />
        ) : (
          <FileIcon size={14} className="text-[var(--text-secondary)] shrink-0" />
        )}
        <span className="text-sm text-[var(--text-primary)] truncate">{node.name}</span>
      </div>
      {node.children.map((child) => (
        <FileTreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </>
  );
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

  const fileTree = useMemo(() => buildFileTree(diff), [diff]);
  const totalAdditions = diff.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = diff.reduce((s, f) => s + f.deletions, 0);
  const shortHash = commitHash.slice(0, 7);

  if (loading) {
    return <div className="py-12 text-center text-sm text-[var(--text-secondary)]">Loading commit...</div>;
  }

  if (error) {
    return <div className="py-12 text-center text-sm text-[var(--text-secondary)]">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Part 1: Commit header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="mb-2">
            <h1 className="text-xl font-mono font-semibold text-[var(--text-primary)]">Commit {shortHash}</h1>
            {commit && (
              <p className="mt-1 text-sm text-[var(--text-secondary)] flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[10px] font-semibold text-[var(--text-primary)] inline-flex items-center justify-center shrink-0">
                  {commit.author.charAt(0).toUpperCase()}
                </span>
                <span className="font-semibold text-[var(--text-primary)]">{commit.author}</span> committed on{" "}
                {new Date(commit.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {commit && (
          <div className="rounded-t-md border-x border-t border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-primary)] font-mono whitespace-pre-wrap">
            {commit.message}
          </div>
        )}

        <div className="flex items-center justify-between border-x border-t border-[var(--border-default)] p-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <GitBranchIcon size={14} />
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-link)]">master</span>
          </div>
        </div>

        <div className="flex items-center rounded-b-md justify-between border border-[var(--border-muted)] p-3in ">
          <span className="text-sm text-[var(--text-secondary)]">
            {diff.length} file{diff.length !== 1 ? "s" : ""} changed
          </span>
          <span className="text-xs font-mono">
            <span className="text-green-600">+{totalAdditions}</span>{" "}
            <span className="text-red-600">-{totalDeletions}</span>
          </span>
        </div>
      </div>

      {/* Part 2 & 3: File tree sidebar + Diff view */}
      <div className="flex gap-4 items-start">
        {/* Part 2: Changed file tree */}
        <aside className="w-[260px] shrink-0 border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] p-3 space-y-1 sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          {fileTree.map((node) => (
            <FileTreeNode key={node.path} node={node} />
          ))}
        </aside>

        {/* Part 3: Diff panels */}
        <div className="flex-1 min-w-0 space-y-4">
          {diff.map((file) => (
            <div key={file.path} id={`diff-${file.path}`} className="border border-[var(--border-default)] rounded-md overflow-hidden">
              <div className="px-4 py-2 bg-[var(--surface-subtle)] border-b border-[var(--border-default)] flex items-center justify-between sticky top-0 z-[1]">
                <span className="text-sm font-mono text-[var(--text-primary)]">{file.path}</span>
                <span className="text-xs font-mono">
                  <span className="text-green-600">+{file.additions}</span>{" "}
                  <span className="text-red-600">-{file.deletions}</span>
                </span>
              </div>
              {file.patch ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono border-collapse">
                    <tbody>
                      {file.patch.split("\n").map((line, i) => {
                        const bg = line.startsWith("+") ? "bg-green-50" :
                          line.startsWith("-") ? "bg-red-50" :
                          line.startsWith("@@") ? "bg-blue-50" : "";
                        const color = line.startsWith("+") ? "text-green-800" :
                          line.startsWith("-") ? "text-red-800" :
                          line.startsWith("@@") ? "text-[var(--text-link)]" : "text-[var(--text-primary)]";
                        return (
                          <tr key={i} className={bg}>
                            <td className={`px-3 py-0 whitespace-pre select-text ${color}`}>{line}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-4 py-3 text-xs text-[var(--text-secondary)]">Binary file or no diff available</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
