import { useState } from "react";
import { X, ChevronDown, TableProperties } from "lucide-react";
import { SpinnerPlaceholder } from "../../shared/LoadingPlaceholders";
import { QueryInput } from "../../shared/QueryInput";

interface ProfileProjectsPageProps {
  isLoading?: boolean;
}

export default function ProfileProjectsPage({ isLoading }: ProfileProjectsPageProps) {
  const [query, setQuery] = useState("is:open");

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <SpinnerPlaceholder size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] focus-within:border-[var(--focus-border,#0969da)] focus-within:ring-1 focus-within:ring-[var(--focus-border,#0969da)]">
          <QueryInput
            value={query}
            onChange={setQuery}
            containerClassName="w-full h-8"
            className="absolute inset-0 w-full h-full pl-9 pr-8 outline-none font-sans text-sm focus:ring-0 focus:outline-none"
          />
          {query && (
            <button 
              type="button" 
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] z-20"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button type="button" className="shrink-0 h-8 px-3 rounded-md bg-[var(--fgColor-success,#1f883d)] text-white text-sm font-semibold hover:bg-[var(--fgColor-success-hover,#1a7f37)]">
          New project
        </button>
      </div>

      {/* Main panel */}
      <div className="border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <button type="button" className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 hover:text-[var(--text-primary)]">
              Open
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--surface-badge)] px-1.5 text-xs font-semibold text-[var(--text-primary)]">0</span>
            </button>
            <button type="button" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5">
              Closed
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--surface-badge)] px-1.5 text-xs font-medium text-[var(--text-primary)]">5</span>
            </button>
          </div>
          <button type="button" className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Sort
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center justify-center py-[70px] px-4 text-center">
          <TableProperties size={24} className="text-[var(--text-secondary)] mb-4" />
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">No open projects</h3>
        </div>
      </div>
    </div>
  );
}

