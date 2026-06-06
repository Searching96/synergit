import { FileIcon } from "lucide-react";
import { FileDirectoryFillIcon } from "@primer/octicons-react";

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
      <button
        type="button"
        onClick={() => {
          if (!node.isDir) {
            document.getElementById(`diff-${node.path}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        className="w-full flex items-center gap-1.5 py-1 px-2 rounded text-xs hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] text-left"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {node.isDir ? (
          <FileDirectoryFillIcon size={14} className="text-[#54aeff] shrink-0" />
        ) : (
          <FileIcon size={14} className="text-[var(--text-secondary)] shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {node.children.map((child) => (
        <FileTreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

interface CommitDiffFileBrowserSectionProps {
  diff: DiffFile[];
}

export default function CommitDiffFileBrowserSection({ diff }: CommitDiffFileBrowserSectionProps) {
  const fileTree = buildFileTree(diff);

  return (
    <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-[var(--border-default)] py-3 px-2">
      {fileTree.map((node) => (
        <FileTreeNode key={node.path} node={node} />
      ))}
    </aside>
  );
}
