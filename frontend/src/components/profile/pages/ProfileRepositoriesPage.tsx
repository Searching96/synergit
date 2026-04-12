import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, XCircle } from "lucide-react";
import { RepoForkedIcon, RepoIcon, StarIcon } from "@primer/octicons-react";
import type { ShowcaseRepo } from "./profileTypes";

function buildSparklinePoints(values: number[], width: number, height: number, padding = 2): string {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x = padding + (index * usableWidth) / Math.max(values.length - 1, 1);
      const normalized = (value - min) / range;
      const y = padding + (1 - normalized) * usableHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

interface ProfileRepositoriesPageProps {
  profileRepositories: ShowcaseRepo[];
  onOpenWorkspace: (repoName: string) => void;
  onCreateRepository: () => void;
  languageColor: (language: string) => string;
}

type RepositoryTypeFilter = "all" | "public" | "private";
type RepositorySortFilter = "updated" | "name" | "stars";

const POPULAR_LANGUAGE_OPTIONS = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Java",
  "Rust",
];

function searchRepositoriesByName(repositories: ShowcaseRepo[], query: string): ShowcaseRepo[] {
  if (!query) {
    return repositories;
  }

  return repositories.filter((repo) => repo.name.toLowerCase().includes(query));
}

export default function ProfileRepositoriesPage({
  profileRepositories,
  onOpenWorkspace,
  onCreateRepository,
  languageColor,
}: ProfileRepositoriesPageProps) {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<RepositoryTypeFilter>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortFilter, setSortFilter] = useState<RepositorySortFilter>("updated");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const typeDropdownRef = useRef<HTMLDivElement | null>(null);
  const languageDropdownRef = useRef<HTMLDivElement | null>(null);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedInsideType = !!typeDropdownRef.current?.contains(target);
      const clickedInsideLanguage = !!languageDropdownRef.current?.contains(target);
      const clickedInsideSort = !!sortDropdownRef.current?.contains(target);

      if (!clickedInsideType && !clickedInsideLanguage && !clickedInsideSort) {
        setIsTypeDropdownOpen(false);
        setIsLanguageDropdownOpen(false);
        setIsSortDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTypeDropdownOpen(false);
        setIsLanguageDropdownOpen(false);
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const languageOptions = useMemo(() => {
    const uniqueLanguages = new Set(POPULAR_LANGUAGE_OPTIONS);

    for (const repo of profileRepositories) {
      if (repo.language) {
        uniqueLanguages.add(repo.language);
      }
    }

    return Array.from(uniqueLanguages);
  }, [profileRepositories]);

  const filteredRepositories = useMemo(() => {
    const searched = searchRepositoriesByName(profileRepositories, searchQuery);
    const byType = searched.filter((repo) => {
      if (typeFilter === "all") {
        return true;
      }

      return repo.visibility.toLowerCase() === typeFilter;
    });

    const byLanguage = byType.filter((repo) => {
      if (languageFilter === "all") {
        return true;
      }

      return repo.language === languageFilter;
    });

    const sorted = [...byLanguage];
    if (sortFilter === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      return sorted;
    }

    if (sortFilter === "stars") {
      sorted.sort((a, b) => (b.stars - a.stars) || a.name.localeCompare(b.name));
      return sorted;
    }

    return sorted;
  }, [languageFilter, profileRepositories, searchQuery, sortFilter, typeFilter]);

  const sortLabel =
    sortFilter === "name"
      ? "Name"
      : sortFilter === "stars"
        ? "Stars"
        : "Last updated";

  const summaryTypeText =
    typeFilter === "all"
      ? "repositories"
      : `${typeFilter} repositories`;

  const summaryLanguageText =
    languageFilter === "all"
      ? ""
      : ` written in ${languageFilter}`;

  const summarySearchText =
    searchQuery
      ? ` matching ${searchQuery}`
      : "";

  const hasActiveFilter =
    searchInput.trim().length > 0 ||
    typeFilter !== "all" ||
    languageFilter !== "all" ||
    sortFilter !== "updated";

  const clearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setTypeFilter("all");
    setLanguageFilter("all");
    setSortFilter("updated");
    setIsTypeDropdownOpen(false);
    setIsLanguageDropdownOpen(false);
    setIsSortDropdownOpen(false);
  };

  const selectTypeFilter = (value: RepositoryTypeFilter) => {
    setTypeFilter(value);
    setIsTypeDropdownOpen(false);
  };

  const selectLanguageFilter = (value: string) => {
    setLanguageFilter(value);
    setIsLanguageDropdownOpen(false);
  };

  const selectSortFilter = (value: RepositorySortFilter) => {
    setSortFilter(value);
    setIsSortDropdownOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative w-full md:flex-1 md:min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Find a repository..."
            className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-9 pr-3 text-sm text-[var(--text-primary)] w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
          <div className="relative" ref={typeDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsTypeDropdownOpen((prev) => !prev);
                setIsLanguageDropdownOpen(false);
                setIsSortDropdownOpen(false);
              }}
              className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-1.5"
            >
              Type
              <ChevronDown size={13} className="text-[var(--text-secondary)]" />
            </button>

            {isTypeDropdownOpen ? (
              <div className="absolute left-0 mt-2 w-[170px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg z-20 py-1">
                {([
                  { value: "all", label: "All" },
                  { value: "public", label: "Public" },
                  { value: "private", label: "Private" },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectTypeFilter(option.value)}
                    className="w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-between"
                  >
                    <span>{option.label}</span>
                    {typeFilter === option.value ? <Check size={14} className="text-[var(--text-secondary)]" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative" ref={languageDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsLanguageDropdownOpen((prev) => !prev);
                setIsTypeDropdownOpen(false);
                setIsSortDropdownOpen(false);
              }}
              className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-1.5"
            >
              Language
              <ChevronDown size={13} className="text-[var(--text-secondary)]" />
            </button>

            {isLanguageDropdownOpen ? (
              <div className="absolute left-0 mt-2 w-[210px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg z-20 py-1 max-h-[280px] overflow-auto">
                <button
                  type="button"
                  onClick={() => selectLanguageFilter("all")}
                  className="w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-between"
                >
                  <span>All</span>
                  {languageFilter === "all" ? <Check size={14} className="text-[var(--text-secondary)]" /> : null}
                </button>

                {languageOptions.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => selectLanguageFilter(language)}
                    className="w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-between"
                  >
                    <span>{language}</span>
                    {languageFilter === language ? <Check size={14} className="text-[var(--text-secondary)]" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsSortDropdownOpen((prev) => !prev);
                setIsTypeDropdownOpen(false);
                setIsLanguageDropdownOpen(false);
              }}
              className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-1.5"
            >
              Sort
              <ChevronDown size={13} className="text-[var(--text-secondary)]" />
            </button>

            {isSortDropdownOpen ? (
              <div className="absolute left-0 mt-2 w-[190px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg z-20 py-1">
                {([
                  { value: "updated", label: "Last updated" },
                  { value: "name", label: "Name" },
                  { value: "stars", label: "Stars" },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectSortFilter(option.value)}
                    className="w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-between"
                  >
                    <span>{option.label}</span>
                    {sortFilter === option.value ? <Check size={14} className="text-[var(--text-secondary)]" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onCreateRepository}
            className="h-8 px-3 rounded-md bg-[var(--accent-secondary)] text-xs font-semibold text-[var(--text-on-accent)] inline-flex items-center gap-1.5"
          >
            <RepoIcon size={12} />
            New
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{filteredRepositories.length}</span> results for <span className="font-semibold text-[var(--text-primary)]">{summaryTypeText}</span>
          {summarySearchText ? (
            <>
              {" "}
              matching <span className="font-semibold text-[var(--text-primary)]">{searchQuery}</span>
            </>
          ) : null}
          {summaryLanguageText ? (
            <>
              {" "}
              written in <span className="font-semibold text-[var(--text-primary)]">{languageFilter}</span>
            </>
          ) : null}
          {" "}
          sorted by <span className="font-semibold text-[var(--text-primary)]">{sortLabel.toLowerCase()}</span>
        </p>

        {hasActiveFilter ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-2"
          >
            <XCircle size={16} />
            Clear filter
          </button>
        ) : null}
      </div>

      <div className="border-t border-[var(--border-muted)]">
        {filteredRepositories.map((repo) => (
          <article key={`repo-${repo.name}`} className="py-6 border-b border-[var(--border-muted)] flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenWorkspace(repo.name)}
                  className="text-xl leading-6 font-semibold text-[var(--text-link)] hover:underline text-left inline-flex items-center gap-2"
                >
                  {repo.name}
                </button>
                <span className="text-[10px] tracking-wide px-1.5 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
                  {repo.visibility}
                </span>
              </div>

              {repo.description && <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-[760px]">{repo.description}</p>}

              <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-secondary)] flex-wrap">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} />
                  {repo.language}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <StarIcon size={12} />
                  {repo.stars}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <RepoForkedIcon size={12} />
                  {repo.forks}
                </span>
                <span>{repo.updatedText}</span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-2">
              <button type="button" className="h-7 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] inline-flex items-center gap-2">
                <StarIcon size={12} />
                Star
              </button>
              <div className="h-6 w-[92px]">
                <svg viewBox="0 0 92 24" className="h-full w-full" role="img" aria-label={`${repo.name} commit trend`}>
                  <polyline
                    points={buildSparklinePoints(repo.sparkline, 92, 24)}
                    fill="none"
                    stroke="var(--accent-sparkline)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </article>
        ))}

        {filteredRepositories.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
            No repositories matched the current search and filter options.
          </div>
        ) : null}
      </div>

      <div className="pt-2 flex justify-center items-center gap-4 text-sm text-[var(--text-secondary)]">
        <button type="button" className="hover:text-[var(--text-link)]">&lt; Previous</button>
        <button type="button" className="text-[var(--text-link)]">Next &gt;</button>
      </div>
    </div>
  );
}

