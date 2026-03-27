import { useMemo, useState } from "react";
import type { Branch } from "../types";
import { ChevronDown, GitBranch } from "lucide-react";

interface BranchMenuProps {
  branches: Branch[];
  currentBranch: string;
  onSelectBranch: (branchName: string) => void;
  onCreateBranch: (branchName: string) => Promise<void>;
}

export default function BranchMenu({
  branches,
  currentBranch,
  onSelectBranch,
  onCreateBranch,
}: BranchMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredBranches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, query]);

  const queryTrimmed = query.trim();
  const branchNameExists = branches.some(
    (b) => b.name.toLowerCase() === queryTrimmed.toLowerCase(),
  );

  const handleCreate = async () => {
    if (!queryTrimmed) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreateBranch(queryTrimmed);
      setQuery("");
      setIsOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to create branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setError(null);
        }}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
      >
        <span className="flex items-center gap-2 truncate">
          <GitBranch size={16} className="text-gray-500" />
          <span className="truncate">{currentBranch || "Select branch"}</span>
        </span>
        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full rounded-md border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Switch branches
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find or create branch..."
            className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />

          <div className="max-h-44 overflow-y-auto rounded-md border border-gray-200">
            {filteredBranches.length > 0 ? (
              filteredBranches.map((b) => (
                <button
                  key={b.name}
                  type="button"
                  onClick={() => {
                    onSelectBranch(b.name);
                    setIsOpen(false);
                    setQuery("");
                    setError(null);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    currentBranch === b.name
                      ? "bg-gray-50 font-semibold text-gray-900"
                      : "text-gray-700"
                  }`}
                >
                  <span>{b.name}</span>
                  {b.is_default && (
                    <span className="text-xs text-gray-500">default</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">No branches found.</div>
            )}
          </div>

          {queryTrimmed && !branchNameExists && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCreate}
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              {isSubmitting
                ? "Creating branch..."
                : `Create branch: ${queryTrimmed} from ${currentBranch}`}
            </button>
          )}

          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        </div>
      )}
    </div>
  );
}
