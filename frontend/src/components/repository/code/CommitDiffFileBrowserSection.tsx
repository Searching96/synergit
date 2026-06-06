import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { FileDirectoryFillIcon } from "@primer/octicons-react";

interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  patch: string;
}

type FileStatus = "added" | "removed" | "changed";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function detectStatus(file: DiffFile): FileStatus {
  if (file.patch.includes("new file mode") || /^---\s+\/dev\/null/m.test(file.patch)) {
    return "added";
  }
  if (file.patch.includes("deleted file mode") || /^\+\+\+\s+\/dev\/null/m.test(file.patch)) {
    return "removed";
  }
  return "changed";
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

function collectAllDirs(nodes: TreeNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    if (n.isDir) {
      acc.push(n.path);
      collectAllDirs(n.children, acc);
    }
  }
  return acc;
}

function FileAddedIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-green-600 shrink-0" aria-hidden="true">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073Zm4.48 3.758a.75.75 0 0 1 .755.745l.01 1.497h1.497a.75.75 0 0 1 0 1.5H9v1.507a.75.75 0 0 1-1.5 0V9.005l-1.502.01a.75.75 0 0 1-.01-1.5l1.507-.01-.01-1.492a.75.75 0 0 1 .745-.755Z"></path>
    </svg>
  );
}

function FileChangedIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-[var(--text-secondary)] shrink-0" aria-hidden="true">
      <path d="M1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073ZM8 3.25a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0V7h-1.5a.75.75 0 0 1 0-1.5h1.5V4A.75.75 0 0 1 8 3.25Zm-3 8a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z"></path>
    </svg>
  );
}

function FileRemovedIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="text-red-600 shrink-0" aria-hidden="true">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073Zm4.5 6h2.242a.75.75 0 0 1 0 1.5h-2.24l-2.254.015a.75.75 0 0 1-.01-1.5Z"></path>
    </svg>
  );
}

function FileStatusIcon({ status }: { status: FileStatus }) {
  if (status === "added") return <FileAddedIcon />;
  if (status === "removed") return <FileRemovedIcon />;
  return <FileChangedIcon />;
}

interface FileTreeNodeProps {
  node: TreeNode;
  depth?: number;
  statusByPath: Map<string, FileStatus>;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
}

function FileTreeNode({ node, depth = 0, statusByPath, expandedDirs, onToggleDir }: FileTreeNodeProps) {
  const isExpanded = node.isDir && expandedDirs.has(node.path);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (node.isDir) {
            onToggleDir(node.path);
          } else {
            document.getElementById(`diff-${node.path}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        className="w-full flex items-center gap-1 py-1 px-2 rounded text-xs hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] text-left"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {node.isDir ? (
          isExpanded ? (
            <ChevronDown size={12} className="text-[var(--text-secondary)] shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-[var(--text-secondary)] shrink-0" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {node.isDir ? (
          <FileDirectoryFillIcon size={14} className="text-[#54aeff] shrink-0" />
        ) : (
          <FileStatusIcon status={statusByPath.get(node.path) ?? "changed"} />
        )}
        <span className="truncate ml-0.5">{node.name}</span>
      </button>
      {node.isDir && isExpanded && node.children.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          statusByPath={statusByPath}
          expandedDirs={expandedDirs}
          onToggleDir={onToggleDir}
        />
      ))}
    </>
  );
}

interface CommitDiffFileBrowserSectionProps {
  diff: DiffFile[];
}

export default function CommitDiffFileBrowserSection({ diff }: CommitDiffFileBrowserSectionProps) {
  const fileTree = useMemo(() => buildFileTree(diff), [diff]);
  const statusByPath = useMemo(() => {
    const map = new Map<string, FileStatus>();
    for (const file of diff) map.set(file.path, detectStatus(file));
    return map;
  }, [diff]);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set(collectAllDirs(fileTree)));

  const handleToggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-[var(--border-default)] py-3 px-2">
      {fileTree.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          statusByPath={statusByPath}
          expandedDirs={expandedDirs}
          onToggleDir={handleToggleDir}
        />
      ))}
    </aside>
  );
}
