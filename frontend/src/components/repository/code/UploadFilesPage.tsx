import { useMemo, useRef, useState } from "react";
import { AlertCircle, GitBranch, UploadCloud, X } from "lucide-react";
import { reposApi } from "../../../services/api";

type UploadCandidate = {
  id: string;
  relativePath: string;
  size: number;
  content: string;
};

interface UploadFilesPageProps {
  repoId: string;
  repoName: string;
  branch: string;
  initialDirectoryPath?: string;
  onCancel: () => void;
  onCommitted: (targetDirectoryPath: string) => void;
}

function normalizeRelativePath(input: string): string {
  return input
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join("/");
}

function joinPath(basePath: string, leafPath: string): string {
  const base = normalizeRelativePath(basePath);
  const leaf = normalizeRelativePath(leafPath);

  if (!base) {
    return leaf;
  }
  if (!leaf) {
    return base;
  }

  return `${base}/${leaf}`;
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadFilesPage({
  repoId,
  repoName,
  branch,
  initialDirectoryPath,
  onCancel,
  onCommitted,
}: UploadFilesPageProps) {
  const [files, setFiles] = useState<UploadCandidate[]>([]);
  const [commitMessage, setCommitMessage] = useState<string>("Add files via upload");
  const [description, setDescription] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const baseDirectoryPath = useMemo(
    () => normalizeRelativePath(initialDirectoryPath || ""),
    [initialDirectoryPath],
  );

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );

  const canCommit = !submitting && files.length > 0 && commitMessage.trim().length > 0;

  const toUploadCandidates = async (incoming: FileList | File[]): Promise<UploadCandidate[]> => {
    const entries = Array.from(incoming);
    const resolved: UploadCandidate[] = [];

    for (const file of entries) {
      const rawRelativePath = file.webkitRelativePath || file.name;
      const relativePath = normalizeRelativePath(rawRelativePath);

      if (!relativePath || relativePath.includes("../") || relativePath.startsWith("..")) {
        continue;
      }

      const content = await file.text();
      resolved.push({
        id: `${relativePath}-${file.size}-${file.lastModified}`,
        relativePath,
        size: file.size,
        content,
      });
    }

    return resolved;
  };

  const appendFiles = async (incoming: FileList | File[]) => {
    setErrorMessage(null);

    try {
      const candidates = await toUploadCandidates(incoming);
      if (candidates.length === 0) {
        setErrorMessage("No valid text files were selected.");
        return;
      }

      setFiles((prev) => {
        const existingByPath = new Map(prev.map((item) => [item.relativePath, item]));
        for (const candidate of candidates) {
          existingByPath.set(candidate.relativePath, candidate);
        }

        return Array.from(existingByPath.values()).sort((a, b) => a.relativePath.localeCompare(b.relativePath));
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to read selected files");
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragActive(false);

    if (event.dataTransfer.files.length === 0) {
      return;
    }

    await appendFiles(event.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleCommit = async () => {
    if (!canCommit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const baseMessage = commitMessage.trim();
      const extra = description.trim();

      const fullMessage = extra ? `${baseMessage}\n\n${extra}` : baseMessage;
      await reposApi.commitFilesChange(repoId, {
        branch,
        files: files.map((file) => ({
          path: joinPath(baseDirectoryPath, file.relativePath),
          content: file.content,
        })),
        commit_message: fullMessage,
      });

      onCommitted(baseDirectoryPath);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      <header className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] truncate">Upload files</h2>
          <p className="text-sm text-[var(--text-secondary)] truncate">{repoName}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
          <GitBranch size={14} className="text-[var(--text-secondary)]" />
          {branch}
        </span>
      </header>

      <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-4 space-y-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          className={`w-full rounded-md border-2 border-dashed p-10 text-center ${
            isDragActive
              ? "border-[var(--accent-primary)] bg-[var(--surface-info-subtle)]"
              : "border-[var(--border-default)] bg-[var(--surface-canvas)]"
          }`}
        >
          <div className="mx-auto h-12 w-12 rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] inline-flex items-center justify-center mb-3">
            <UploadCloud size={20} className="text-[var(--text-secondary)]" />
          </div>
          <p className="text-xl font-semibold text-[var(--text-primary)]">Drag additional files here to add them to your repository</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">or choose your files</p>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files;
            if (selected && selected.length > 0) {
              void appendFiles(selected);
            }
            event.target.value = "";
          }}
        />

        {files.length > 0 ? (
          <div className="rounded-md border border-[var(--border-default)] overflow-hidden">
            {files.map((file) => (
              <div key={file.id} className="px-4 py-2.5 border-b border-[var(--border-muted)] last:border-b-0 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{file.relativePath}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="h-7 w-7 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center"
                  aria-label={`Remove ${file.relativePath}`}
                >
                  <X size={13} className="text-[var(--text-secondary)]" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Commit changes</h3>
        <input
          value={commitMessage}
          onChange={(event) => setCommitMessage(event.target.value)}
          placeholder="Commit message"
          className="w-full h-10 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add an optional extended description..."
          className="w-full min-h-[84px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-3 text-sm text-[var(--text-primary)]"
        />
        <p className="text-xs text-[var(--text-secondary)]">Committing directly to the {branch} branch.</p>

        {errorMessage ? (
          <p className="text-sm text-[var(--text-danger)] inline-flex items-center gap-1.5">
            <AlertCircle size={14} />
            {errorMessage}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCommit}
            disabled={!canCommit}
            className="h-9 px-4 rounded-md border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
          >
            {submitting ? "Committing..." : "Commit changes"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="h-9 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
          >
            Cancel
          </button>
          <span className="ml-auto text-xs text-[var(--text-secondary)]">
            {files.length} file{files.length === 1 ? "" : "s"} · {formatFileSize(totalSize)}
          </span>
        </div>
      </section>
    </div>
  );
}
