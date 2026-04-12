import { useMemo, useState } from "react";
import { AlertCircle, FilePlus2, GitBranch, Save } from "lucide-react";
import { reposApi } from "../../../services/api";

interface NewFilePageProps {
  repoId: string;
  repoName: string;
  branch: string;
  initialDirectoryPath?: string;
  onCancel: () => void;
  onCommitted: (createdFilePath: string) => void;
}

function normalizeRelativePath(input: string): string {
  return input
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join("/");
}

function hasUnsafeSegments(input: string): boolean {
  const segments = input.split("/").map((segment) => segment.trim());
  return segments.some((segment) => segment === "." || segment === "..");
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

export default function NewFilePage({
  repoId,
  repoName,
  branch,
  initialDirectoryPath,
  onCancel,
  onCommitted,
}: NewFilePageProps) {
  const [fileName, setFileName] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState<string>("Create new file");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const baseDirectoryPath = useMemo(() => normalizeRelativePath(initialDirectoryPath || ""), [initialDirectoryPath]);
  const normalizedLeafPath = useMemo(() => normalizeRelativePath(fileName), [fileName]);
  const targetFilePath = useMemo(() => joinPath(baseDirectoryPath, normalizedLeafPath), [baseDirectoryPath, normalizedLeafPath]);

  const validationError = useMemo(() => {
    if (!fileName.trim()) {
      return "File name is required.";
    }

    if (fileName.startsWith("/") || fileName.startsWith("\\")) {
      return "File path must be relative to the repository.";
    }

    if (hasUnsafeSegments(fileName.replace(/\\/g, "/"))) {
      return "File path cannot contain . or .. segments.";
    }

    return null;
  }, [fileName]);

  const canCommit = !submitting && !validationError && targetFilePath.length > 0;

  const handleCommit = async () => {
    if (!canCommit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const message = commitMessage.trim() || "Create new file";
      const fullMessage = description.trim() ? `${message}\n\n${description.trim()}` : message;

      await reposApi.commitFileChange(repoId, {
        branch,
        path: targetFilePath,
        content: fileContent,
        commit_message: fullMessage,
      });

      onCommitted(targetFilePath);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create file");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      <header className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] truncate">Create new file</h2>
          <p className="text-sm text-[var(--text-secondary)] truncate">{repoName}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
          <GitBranch size={14} className="text-[var(--text-secondary)]" />
          {branch}
        </span>
      </header>

      <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-4 space-y-4">
        <div>
          <label htmlFor="new-file-name" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Name your file
          </label>
          <div className="rounded-md border border-[var(--border-default)] overflow-hidden flex items-center">
            {baseDirectoryPath ? (
              <span className="px-3 py-2 text-sm text-[var(--text-secondary)] bg-[var(--surface-subtle)] border-r border-[var(--border-default)]">
                {baseDirectoryPath}/
              </span>
            ) : null}
            <input
              id="new-file-name"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="example: src/index.tsx"
              className="flex-1 h-10 px-3 text-sm text-[var(--text-primary)] bg-[var(--surface-canvas)]"
            />
          </div>
          {validationError ? (
            <p className="mt-2 text-xs text-[var(--text-danger)] inline-flex items-center gap-1.5">
              <AlertCircle size={12} />
              {validationError}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="new-file-content" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            File content
          </label>
          <textarea
            id="new-file-content"
            value={fileContent}
            onChange={(event) => setFileContent(event.target.value)}
            placeholder="Enter file contents here"
            spellCheck={false}
            className="w-full min-h-[360px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-3 font-mono text-sm text-[var(--text-primary)]"
          />
        </div>
      </section>

      <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Commit new file</h3>
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
          <p className="text-sm text-[var(--text-danger)]">{errorMessage}</p>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCommit}
            disabled={!canCommit}
            className="h-9 px-4 rounded-md bg-[var(--accent-success)] text-[var(--text-on-accent)] text-sm font-semibold inline-flex items-center gap-2 hover:opacity-95 disabled:opacity-60"
          >
            <Save size={14} />
            {submitting ? "Committing..." : "Commit new file"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="h-9 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
          >
            Cancel
          </button>
        </div>
      </section>

      <footer className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-2">
        <FilePlus2 size={14} />
        New file target: {targetFilePath || "(not set)"}
      </footer>
    </div>
  );
}
