interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  patch: string;
}

interface CommitDiffSectionProps {
  diff: DiffFile[];
}

export default function CommitDiffSection({ diff }: CommitDiffSectionProps) {
  return (
    <div className="flex-1 min-w-0 h-full overflow-y-auto py-3 px-3">
      {diff.map((file) => (
        <div key={file.path} id={`diff-${file.path}`} className="mb-4 border border-[var(--border-default)] rounded-md overflow-hidden">
          <div className="px-3 py-2 bg-[var(--surface-subtle)] border-b border-[var(--border-default)] flex items-center justify-between sticky top-0 z-[1]">
            <span className="text-xs font-mono text-[var(--text-primary)]">{file.path}</span>
            <span className="text-xs font-mono">
              <span className="text-green-600 font-semibold">+{file.additions}</span>{" "}
              <span className="text-red-600 font-semibold">-{file.deletions}</span>
            </span>
          </div>
          {file.patch ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <tbody>
                  {file.patch.split("\n").map((line, i) => {
                    const bg = line.startsWith("+") ? "bg-[#dafbe1]" :
                      line.startsWith("-") ? "bg-[#ffebe9]" :
                      line.startsWith("@@") ? "bg-[#ddf4ff]" : "";
                    const color = line.startsWith("+") ? "text-[#1a7f37]" :
                      line.startsWith("-") ? "text-[#cf222e]" :
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
  );
}
