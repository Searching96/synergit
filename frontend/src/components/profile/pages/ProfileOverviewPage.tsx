import { useEffect, useMemo, useRef, useState } from "react";
import { RepoIcon } from "@primer/octicons-react";
import { reposApi } from "../../../services/api/repos";
import type { ProfileActivitySnapshot } from "../../../types";
import type { ShowcaseRepo } from "./utils/profileTypes";

interface ProfileOverviewPageProps {
  pinnedRepositories: ShowcaseRepo[];
  onOpenWorkspace: (repoName: string) => void;
  languageColor: (language: string) => string;
  contributionColor: (level: number) => string;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DAY_ROW_LABELS: Array<{ label: string; row: number }> = [
  { label: "Mon", row: 1 },
  { label: "Wed", row: 3 },
  { label: "Fri", row: 5 },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_CELL_SIZE = 10;
const CELL_GAP = 3;
const MONTH_LABEL_MIN_GAP_PX = 24;

type MonthAnchor = {
  label: string;
  weekIndex: number;
};

type ContributionCalendar = {
  weeks: number[][];
  monthAnchors: MonthAnchor[];
  totalContributions: number;
};

function atStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, dayCount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + dayCount);
  return next;
}

function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay());
}

function endOfWeek(date: Date): Date {
  return addDays(date, 6 - date.getDay());
}

function diffInDays(fromDate: Date, toDate: Date): number {
  return Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_MS);
}

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function contributionLevel(commitCount: number, maxCommitCount: number): number {
  if (commitCount <= 0) {
    return 0;
  }

  if (maxCommitCount <= 1) {
    return 1;
  }

  const levelOneMax = Math.max(1, Math.ceil(maxCommitCount * 0.25));
  const levelTwoMax = Math.max(levelOneMax + 1, Math.ceil(maxCommitCount * 0.5));
  const levelThreeMax = Math.max(levelTwoMax + 1, Math.ceil(maxCommitCount * 0.75));

  if (commitCount <= levelOneMax) {
    return 1;
  }
  if (commitCount <= levelTwoMax) {
    return 2;
  }
  if (commitCount <= levelThreeMax) {
    return 3;
  }

  return 4;
}

function buildMonthAnchors(rangeStart: Date, rangeEnd: Date, calendarStart: Date): MonthAnchor[] {
  const monthAnchors: MonthAnchor[] = [];
  const monthCursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const lastMonthStart = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

  while (monthCursor <= lastMonthStart) {
    const anchorDate = monthCursor < rangeStart ? rangeStart : monthCursor;
    const dayOffset = diffInDays(calendarStart, anchorDate);
    const weekIndex = Math.floor(dayOffset / 7);
    const label = MONTH_LABELS[monthCursor.getMonth()];

    if (monthAnchors.length === 0 || monthAnchors[monthAnchors.length - 1].weekIndex !== weekIndex) {
      monthAnchors.push({ label, weekIndex });
    }

    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  return monthAnchors;
}

function buildContributionCalendar(
  rangeStart: Date,
  rangeEnd: Date,
  dayCommitCount: Map<string, number>,
): ContributionCalendar {
  const startDate = atStartOfDay(rangeStart);
  const endDate = atStartOfDay(rangeEnd);
  const calendarStart = startOfWeek(startDate);
  const calendarEnd = endOfWeek(endDate);

  const maxCommitCount = Array.from(dayCommitCount.values()).reduce(
    (maxValue, value) => Math.max(maxValue, value),
    0,
  );

  const weeks: number[][] = [];
  let currentWeek: number[] = [];
  let totalContributions = 0;

  for (let cursor = new Date(calendarStart); cursor <= calendarEnd; cursor = addDays(cursor, 1)) {
    const inRange = cursor >= startDate && cursor <= endDate;
    let level = 0;

    if (inRange) {
      const count = dayCommitCount.get(toDateKey(cursor)) ?? 0;
      level = contributionLevel(count, maxCommitCount);
      totalContributions += count;
    }

    currentWeek.push(level);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return {
    weeks,
    monthAnchors: buildMonthAnchors(startDate, endDate, calendarStart),
    totalContributions,
  };
}

function toPercentage(value: number, total: number): number {
  if (value <= 0 || total <= 0) {
    return 0;
  }

  return Math.max(1, Math.round((value / total) * 100));
}

export default function ProfileOverviewPage({
  pinnedRepositories,
  onOpenWorkspace,
  languageColor,
  contributionColor,
}: ProfileOverviewPageProps) {
  const matrixHostRef = useRef<HTMLDivElement | null>(null);

  const [requestedYear, setRequestedYear] = useState<number | undefined>(undefined);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [matrixHostWidth, setMatrixHostWidth] = useState(0);
  const [profileActivity, setProfileActivity] = useState<ProfileActivitySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfileActivity = async () => {
      setIsLoading(true);

      try {
        const snapshot = await reposApi.getProfileActivity(requestedYear);
        if (cancelled) {
          return;
        }

        setProfileActivity(snapshot);
        setLoadError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load activity.";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProfileActivity();

    return () => {
      cancelled = true;
    };
  }, [requestedYear, reloadNonce]);

  const selectedYear = profileActivity?.selected_year ?? new Date().getFullYear();
  const availableYears = profileActivity?.available_years ?? [];

  const dayCommitCount = useMemo(() => {
    const countByDay = new Map<string, number>();

    for (const day of profileActivity?.contribution_days ?? []) {
      countByDay.set(day.date, day.commit_count);
    }

    return countByDay;
  }, [profileActivity]);

  const { weeks: yearContributions, monthAnchors, totalContributions: matrixTotalContributions } = useMemo(
    () => buildContributionCalendar(
      new Date(selectedYear, 0, 1),
      new Date(selectedYear, 11, 31),
      dayCommitCount,
    ),
    [dayCommitCount, selectedYear],
  );

  const totalContributions = profileActivity?.total_contributions ?? matrixTotalContributions;
  const contributionCountText = `${totalContributions.toLocaleString()} contributions`;
  const contributionSuffix = `in ${selectedYear}`;

  const weekCount = yearContributions.length;

  useEffect(() => {
    const host = matrixHostRef.current;
    if (!host) {
      return;
    }

    const updateWidth = () => {
      setMatrixHostWidth(host.clientWidth);
    };

    updateWidth();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateWidth());
      observer.observe(host);
    }

    window.addEventListener("resize", updateWidth);

    return () => {
      window.removeEventListener("resize", updateWidth);
      observer?.disconnect();
    };
  }, [weekCount]);

  const cellSize = useMemo(() => {
    if (weekCount === 0 || matrixHostWidth <= 0) {
      return MIN_CELL_SIZE;
    }

    const availableWidth = matrixHostWidth - Math.max(weekCount - 1, 0) * CELL_GAP;
    return Math.max(MIN_CELL_SIZE, Math.floor(availableWidth / weekCount));
  }, [matrixHostWidth, weekCount]);

  const matrixWidth = weekCount * cellSize + Math.max(weekCount - 1, 0) * CELL_GAP;
  const matrixHeight = 7 * cellSize + 6 * CELL_GAP;

  const displayMonthAnchors = useMemo(() => {
    const visible: Array<MonthAnchor & { left: number }> = [];

    for (const anchor of monthAnchors) {
      const left = anchor.weekIndex * (cellSize + CELL_GAP);
      const previous = visible[visible.length - 1];

      if (!previous || left - previous.left >= MONTH_LABEL_MIN_GAP_PX) {
        visible.push({ ...anchor, left });
      }
    }

    return visible;
  }, [cellSize, monthAnchors]);

  const activityChart = profileActivity?.activity_chart ?? {
    commits: 0,
    code_reviews: 0,
    issues: 0,
    pull_requests: 0,
  };

  const activityTotal = activityChart.commits +
    activityChart.code_reviews +
    activityChart.issues +
    activityChart.pull_requests;

  const activitySplit = {
    commits: toPercentage(activityChart.commits, activityTotal),
    codeReview: toPercentage(activityChart.code_reviews, activityTotal),
    issues: toPercentage(activityChart.issues, activityTotal),
    pullRequests: toPercentage(activityChart.pull_requests, activityTotal),
  };

  const activityGraphCenter = 90;
  const activityGraphRadius = 72;
  const activityPoints = {
    codeReview: {
      value: activitySplit.codeReview,
      x: activityGraphCenter,
      y: activityGraphCenter - (activityGraphRadius * activitySplit.codeReview) / 100,
    },
    issues: {
      value: activitySplit.issues,
      x: activityGraphCenter + (activityGraphRadius * activitySplit.issues) / 100,
      y: activityGraphCenter,
    },
    pullRequests: {
      value: activitySplit.pullRequests,
      x: activityGraphCenter,
      y: activityGraphCenter + (activityGraphRadius * activitySplit.pullRequests) / 100,
    },
    commits: {
      value: activitySplit.commits,
      x: activityGraphCenter - (activityGraphRadius * activitySplit.commits) / 100,
      y: activityGraphCenter,
    },
  };

  const activityOrder = ["codeReview", "issues", "pullRequests", "commits"] as const;

  const activityPolygonPoints = activityOrder
    .map((axis) => {
      const point = activityPoints[axis];
      if (point.value <= 0) {
        return `${activityGraphCenter},${activityGraphCenter}`;
      }
      return `${point.x},${point.y}`;
    })
    .join(" ");

  const visibleActivityPoints = activityOrder
    .map((axis) => ({ axis, ...activityPoints[axis] }))
    .filter((point) => point.value > 0);

  const topRepositories = profileActivity?.activity_overview.top_repositories ?? [];
  const otherRepoCount = profileActivity?.activity_overview.other_repo_count ?? 0;
  const commitsLast365Days = profileActivity?.activity_overview.commits_last_365_days ?? 0;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Pinned</h2>
          <button type="button" className="text-xs text-[var(--text-link)] hover:underline">Customize your pins</button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {pinnedRepositories.map((repo) => (
            <article key={`pin-${repo.name}`} className="border border-[var(--border-default)] rounded-md p-4 bg-[var(--surface-canvas)]">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenWorkspace(repo.name)}
                  className="text-sm font-semibold text-[var(--text-link)] hover:underline inline-flex items-center gap-2"
                >
                  <RepoIcon size={14} className="text-[var(--text-secondary)]" />
                  {repo.name}
                </button>
                <span className="text-[10px] tracking-wide px-1.5 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
                  {repo.visibility}
                </span>
              </div>
              {repo.description ? (
                <p className="mt-3 text-sm text-[var(--text-secondary)] min-h-[36px]">{repo.description}</p>
              ) : null}
              {repo.language ? (
                <div className="mt-3 ml-0.5 inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} />
                  {repo.language}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_100px] gap-6 items-start">
        <div className="space-y-6">
          <section className="border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] overflow-hidden">
            <div className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">{contributionCountText}</span> {contributionSuffix}
                </p>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-stretch">
                  <button type="button" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    Contribution settings ▼
                  </button>
                </div>
              </div>

              {loadError ? (
                <div className="mt-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)] flex items-center justify-between gap-3">
                  <span>{loadError}</span>
                  <button
                    type="button"
                    onClick={() => setReloadNonce((value) => value + 1)}
                    className="rounded-md border border-[var(--border-default)] px-2 py-1 text-[var(--text-link)] hover:bg-[var(--surface-hover)]"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              <div className="mt-3">
                <div ref={matrixHostRef} className="w-full overflow-x-auto">
                  <div className="min-w-[620px] w-full">
                    <div className="pl-10 pr-2">
                      <div className="relative h-4 text-xs text-[var(--text-secondary)]" style={{ width: `${matrixWidth}px` }}>
                        {displayMonthAnchors.map((month, index) => (
                          <span
                            key={`month-${month.label}-${month.weekIndex}-${index}`}
                            className="absolute top-0"
                            style={{ left: `${month.left}px` }}
                          >
                            {month.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-1 flex items-start gap-2">
                      <div className="relative w-8 shrink-0 text-xs text-[var(--text-secondary)]" style={{ height: `${matrixHeight}px` }}>
                        {DAY_ROW_LABELS.map((item) => (
                          <span
                            key={item.label}
                            className="absolute left-0"
                            style={{ top: `${item.row * (cellSize + CELL_GAP)}px` }}
                          >
                            {item.label}
                          </span>
                        ))}
                      </div>

                      <div className="inline-flex" style={{ gap: `${CELL_GAP}px`, width: `${matrixWidth}px` }}>
                        {yearContributions.map((week, index) => (
                          <div key={`week-${index}`} className="flex flex-col" style={{ gap: `${CELL_GAP}px`, width: `${cellSize}px` }}>
                            {week.map((level, dayIndex) => (
                              <span
                                key={`cell-${index}-${dayIndex}`}
                                className="rounded-[2px]"
                                style={{
                                  width: `${cellSize}px`,
                                  height: `${cellSize}px`,
                                  backgroundColor: contributionColor(level),
                                }}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <p className="mt-3 text-xs text-[var(--text-secondary)]">Loading contribution activity...</p>
              ) : null}

              <div className="mt-4 text-xs text-[var(--text-secondary)] flex items-center justify-between">
                <span>Learn how we count contributions</span>
                <div className="inline-flex items-center gap-2">
                  <span>Less</span>
                  <div className="inline-flex gap-1">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <span key={`legend-${level}`} className="h-[10px] w-[10px] rounded-[2px]" style={{ backgroundColor: contributionColor(level) }} />
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border-muted)] p-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Activity overview</h3>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] gap-6">
                <div className="text-sm text-[var(--text-secondary)] lg:pr-8 lg:border-r lg:border-[var(--border-muted)]">
                  {topRepositories.length > 0 ? (
                    <p className="text-[var(--text-primary)] leading-6">
                      Contributed to{" "}
                      {topRepositories.map((repo, index) => (
                        <span key={repo.repository}>
                          <span className="text-[var(--text-link)]">{repo.repository}</span>
                          {index < topRepositories.length - 1 ? ", " : ""}
                        </span>
                      ))}
                      {" "}and {otherRepoCount} other {otherRepoCount === 1 ? "repository" : "repositories"} in the last 365 days.
                    </p>
                  ) : (
                    <p className="text-[var(--text-primary)]">No repository contributions in the last 365 days.</p>
                  )}
                </div>

                <div className="flex items-center justify-center">
                  <div className="relative w-full max-w-[320px] h-[190px] text-[var(--text-secondary)]">
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 text-center text-sm">
                      {activitySplit.codeReview}%
                      <br />
                      Code review
                    </span>
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-center text-sm">
                      {activitySplit.commits}%
                      <br />
                      Commits
                    </span>
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-center text-sm">
                      {activitySplit.issues}%
                      <br />
                      Issues
                    </span>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-sm">
                      {activitySplit.pullRequests}%
                      <br />
                      Pull requests
                    </span>

                    <svg viewBox="0 0 180 180" className="absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2" role="img" aria-label="Activity distribution graph">
                      <line x1={activityGraphCenter} y1={18} x2={activityGraphCenter} y2={162} stroke="var(--border-default)" strokeWidth="2" />
                      <line x1={18} y1={activityGraphCenter} x2={162} y2={activityGraphCenter} stroke="var(--border-default)" strokeWidth="2" />

                      {visibleActivityPoints.map((point) => (
                        <line
                          key={`activity-line-${point.axis}`}
                          x1={activityGraphCenter}
                          y1={activityGraphCenter}
                          x2={point.x}
                          y2={point.y}
                          stroke="var(--accent-line)"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      ))}

                      <polygon points={activityPolygonPoints} fill="var(--contrib-level-1)" fillOpacity="0.65" stroke="var(--accent-line)" strokeWidth="2" />

                      {visibleActivityPoints.map((point) => (
                        <circle
                          key={`activity-point-${point.axis}`}
                          cx={point.x}
                          cy={point.y}
                          r="3.5"
                          fill="var(--surface-canvas)"
                          stroke="var(--accent-line)"
                          strokeWidth="2"
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3 text-sm text-[var(--text-secondary)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Contribution activity</h3>
            <div className="border border-[var(--border-default)] rounded-md p-4 bg-[var(--surface-canvas)] space-y-2">
              <p className="text-[var(--text-primary)]">Last 365 days</p>
              <p>Created {commitsLast365Days.toLocaleString()} commits</p>
              <p>Opened {activityChart.pull_requests.toLocaleString()} pull requests</p>
              <p>Opened {activityChart.issues.toLocaleString()} issues</p>
              <p>Completed {activityChart.code_reviews.toLocaleString()} code reviews</p>
            </div>
          </section>
        </div>

        <div className="w-full lg:w-[100px] rounded-md bg-[var(--surface-canvas)] overflow-hidden text-sm text-[var(--text-secondary)]">
          {availableYears.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">No years</div>
          ) : (
            [...availableYears]
              .sort((a, b) => b - a)
              .map((year) => {
                const active = selectedYear === year;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setRequestedYear(year)}
                    className={`w-full h-10 px-3 text-left ${active ? "bg-[var(--text-link)] text-[var(--text-on-accent)] font-medium" : "hover:bg-[var(--surface-subtle)]"}`}
                  >
                    {year}
                  </button>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}

