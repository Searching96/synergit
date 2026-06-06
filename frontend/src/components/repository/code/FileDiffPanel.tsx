interface FileDiffPanelProps {
  path: string;
  additions: number;
  deletions: number;
  patch: string;
}

type DiffRow =
  | { kind: "hunk"; header: string }
  | { kind: "context"; oldNum: number; newNum: number; content: string }
  | { kind: "change"; oldNum: number | null; oldContent: string | null; newNum: number | null; newContent: string | null };

interface Hunk {
  header: string;
  rows: DiffRow[];
}

function parseUnifiedDiff(patch: string): Hunk[] {
  const lines = patch.split("\n");
  const hunks: Hunk[] = [];
  let currentHunk: Hunk | null = null;
  let oldLine = 0;
  let newLine = 0;
  let pendingDeletions: { num: number; content: string }[] = [];
  let pendingAdditions: { num: number; content: string }[] = [];

  const flushPending = () => {
    if (!currentHunk) return;
    const max = Math.max(pendingDeletions.length, pendingAdditions.length);
    for (let i = 0; i < max; i++) {
      const del = pendingDeletions[i];
      const add = pendingAdditions[i];
      currentHunk.rows.push({
        kind: "change",
        oldNum: del?.num ?? null,
        oldContent: del?.content ?? null,
        newNum: add?.num ?? null,
        newContent: add?.content ?? null,
      });
    }
    pendingDeletions = [];
    pendingAdditions = [];
  };

  for (const raw of lines) {
    // Skip diff header lines that come before any hunk
    if (raw.startsWith("diff --git") || raw.startsWith("index ") || raw.startsWith("--- ") || raw.startsWith("+++ ") ||
        raw.startsWith("new file mode") || raw.startsWith("deleted file mode") || raw.startsWith("similarity index") ||
        raw.startsWith("rename from") || raw.startsWith("rename to") || raw.startsWith("Binary files")) {
      continue;
    }

    if (raw.startsWith("@@")) {
      flushPending();
      const match = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      oldLine = match ? parseInt(match[1], 10) : 0;
      newLine = match ? parseInt(match[2], 10) : 0;
      currentHunk = { header: raw, rows: [{ kind: "hunk", header: raw }] };
      hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) continue;

    if (raw.startsWith("\\")) {
      // "\ No newline at end of file" — ignore for rendering purposes
      continue;
    }

    if (raw.startsWith("-")) {
      pendingDeletions.push({ num: oldLine, content: raw.slice(1) });
      oldLine += 1;
    } else if (raw.startsWith("+")) {
      pendingAdditions.push({ num: newLine, content: raw.slice(1) });
      newLine += 1;
    } else {
      // Context line (starts with space, or is empty)
      flushPending();
      const content = raw.startsWith(" ") ? raw.slice(1) : raw;
      currentHunk.rows.push({ kind: "context", oldNum: oldLine, newNum: newLine, content });
      oldLine += 1;
      newLine += 1;
    }
  }
  flushPending();

  return hunks;
}

export default function FileDiffPanel({ path, additions, deletions, patch }: FileDiffPanelProps) {
  if (!patch) {
    return (
      <div className="mb-4 border border-[var(--border-default)] rounded-md overflow-hidden">
        <div className="px-3 py-2 bg-[var(--surface-subtle)] border-b border-[var(--border-default)] flex items-center justify-between sticky top-0 z-[1]">
          <span className="text-xs font-mono text-[var(--text-primary)]">{path}</span>
          <span className="text-xs font-mono">
            <span className="text-green-600 font-semibold">+{additions}</span>{" "}
            <span className="text-red-600 font-semibold">-{deletions}</span>
          </span>
        </div>
        <p className="px-4 py-3 text-xs text-[var(--text-secondary)]">Binary file or no diff available</p>
      </div>
    );
  }

  const hunks = parseUnifiedDiff(patch);

  return (
    <div id={`diff-${path}`} className="mb-4 border border-[var(--border-default)] rounded-md overflow-hidden">
      <div className="px-3 py-2 bg-[var(--surface-subtle)] border-b border-[var(--border-default)] flex items-center justify-between sticky top-0 z-[1]">
        <span className="text-xs font-mono text-[var(--text-primary)]">{path}</span>
        <span className="text-xs font-mono">
          <span className="text-green-600 font-semibold">+{additions}</span>{" "}
          <span className="text-red-600 font-semibold">-{deletions}</span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <colgroup>
            <col style={{ width: 40 }} />
            <col />
            <col style={{ width: 40 }} />
            <col />
          </colgroup>
          <tbody>
            {hunks.flatMap((hunk, hIdx) =>
              hunk.rows.map((row, rIdx) => {
                const key = `${hIdx}-${rIdx}`;
                if (row.kind === "hunk") {
                  return (
                    <tr key={key} className="bg-[#ddf4ff]">
                      <td colSpan={4} className="px-3 py-0.5 text-[var(--text-link)] whitespace-pre">{row.header}</td>
                    </tr>
                  );
                }
                if (row.kind === "context") {
                  return (
                    <tr key={key}>
                      <td className="px-2 text-right text-[var(--text-muted)] select-none border-r border-[var(--border-muted)] align-top">{row.oldNum}</td>
                      <td className="px-3 whitespace-pre select-text text-[var(--text-primary)] border-r border-[var(--border-muted)]">{row.content}</td>
                      <td className="px-2 text-right text-[var(--text-muted)] select-none border-r border-[var(--border-muted)] align-top">{row.newNum}</td>
                      <td className="px-3 whitespace-pre select-text text-[var(--text-primary)]">{row.content}</td>
                    </tr>
                  );
                }
                // change row
                const hasOld = row.oldNum !== null;
                const hasNew = row.newNum !== null;
                return (
                  <tr key={key}>
                    <td className={`px-2 text-right select-none border-r border-[var(--border-muted)] align-top ${hasOld ? "bg-[#ffd7d5] text-[var(--text-muted)]" : ""}`}>{row.oldNum ?? ""}</td>
                    <td className={`px-3 whitespace-pre select-text border-r border-[var(--border-muted)] ${hasOld ? "bg-[#ffebe9] text-[#cf222e]" : ""}`}>
                      {hasOld ? <><span className="select-none">-</span>{row.oldContent}</> : ""}
                    </td>
                    <td className={`px-2 text-right select-none border-r border-[var(--border-muted)] align-top ${hasNew ? "bg-[#ccffd8] text-[var(--text-muted)]" : ""}`}>{row.newNum ?? ""}</td>
                    <td className={`px-3 whitespace-pre select-text ${hasNew ? "bg-[#dafbe1] text-[#1a7f37]" : ""}`}>
                      {hasNew ? <><span className="select-none">+</span>{row.newContent}</> : ""}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
