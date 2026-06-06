import FileDiffPanel from "./FileDiffPanel";

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
    <div className="flex-1 min-w-0 overflow-y-auto py-3 px-3">
      {diff.map((file) => (
        <FileDiffPanel
          key={file.path}
          path={file.path}
          additions={file.additions}
          deletions={file.deletions}
          patch={file.patch}
        />
      ))}
    </div>
  );
}
