import { useMemo, useState } from "react";
import { Book } from "lucide-react";
import type { ShowcaseRepo } from "./profileTypes";

interface ProfileOverviewPageProps {
  pinnedRepositories: ShowcaseRepo[];
  contributions: number[][];
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

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const DAY_MS = 24 * 60 * 60 * 1000;
const CELL_SIZE = 10;
const CELL_GAP = 3;
const LEVEL_TO_COUNT = [0, 1, 3, 6, 10];
const ACTIVITY_SPLIT = {
  commits: 40,
  codeReview: 10,
  issues: 20,
  pullRequests: 30,
};

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

function mapSeedToContributionLevel(seedValue: number, dayOfYear: number, year: number): number {
  const score = (seedValue + dayOfYear * 7 + year) % 10;
  if (score < 3) return 0;
  if (score < 5) return 1;
  if (score < 7) return 2;
  if (score < 9) return 3;
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

function buildContributionCalendar(rangeStart: Date, rangeEnd: Date, seedLevels: number[]): ContributionCalendar {
  const startDate = atStartOfDay(rangeStart);
  const endDate = atStartOfDay(rangeEnd);

  const calendarStart = startOfWeek(startDate);
  const calendarEnd = endOfWeek(endDate);

  const safeSeed = seedLevels.length > 0 ? seedLevels : [0, 1, 2, 3, 4, 2, 1];
  const weeks: number[][] = [];
  let currentWeek: number[] = [];
  let totalContributions = 0;

  for (let cursor = new Date(calendarStart); cursor <= calendarEnd; cursor = addDays(cursor, 1)) {
    const inRange = cursor >= startDate && cursor <= endDate;
    let level = 0;

    if (inRange) {
      const dayOffset = diffInDays(startDate, cursor);
      const seedValue = safeSeed[(dayOffset + cursor.getFullYear()) % safeSeed.length] ?? 0;
      level = mapSeedToContributionLevel(seedValue, dayOffset, cursor.getFullYear());
      totalContributions += LEVEL_TO_COUNT[level] ?? 0;
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

export default function ProfileOverviewPage({
  pinnedRepositories,
  contributions,
  onOpenWorkspace,
  languageColor,
  contributionColor,
}: ProfileOverviewPageProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const contributionSeed = useMemo(
    () => contributions.flat().map((level) => Math.min(4, Math.max(0, level))),
    [contributions],
  );

  const { weeks: yearContributions, monthAnchors, totalContributions } = useMemo(
    () => {
      const today = atStartOfDay(new Date());
      if (selectedYear === null) {
        const start = addDays(today, -364);
        return buildContributionCalendar(start, today, contributionSeed);
      }

      return buildContributionCalendar(
        new Date(selectedYear, 0, 1),
        new Date(selectedYear, 11, 31),
        contributionSeed,
      );
    },
    [selectedYear, contributionSeed],
  );

  const matrixWidth = yearContributions.length * (CELL_SIZE + CELL_GAP);
  const contributionCountText = `${totalContributions.toLocaleString()} contributions`;
  const contributionSuffix = selectedYear === null ? "in the last year" : `in ${selectedYear}`;

  const activityGraphCenter = 90;
  const activityGraphRadius = 72;
  const leftPointX = activityGraphCenter - (activityGraphRadius * ACTIVITY_SPLIT.commits) / 100;
  const rightPointX = activityGraphCenter + (activityGraphRadius * ACTIVITY_SPLIT.issues) / 100;
  const topPointY = activityGraphCenter - (activityGraphRadius * ACTIVITY_SPLIT.codeReview) / 100;
  const bottomPointY = activityGraphCenter + (activityGraphRadius * ACTIVITY_SPLIT.pullRequests) / 100;
  const activityPolygonPoints = [
    `${activityGraphCenter},${topPointY}`,
    `${rightPointX},${activityGraphCenter}`,
    `${activityGraphCenter},${bottomPointY}`,
    `${leftPointX},${activityGraphCenter}`,
  ].join(" ");

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
                  <Book size={14} className="text-[var(--text-secondary)]" />
                  {repo.name}
                </button>
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
                  {repo.visibility}
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--text-secondary)] min-h-[36px]">{repo.description || "No description provided."}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} />
                {repo.language}
              </div>
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

              <div className="mt-3 overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="pl-10 pr-2">
                    <div className="relative h-4 text-xs text-[var(--text-secondary)]" style={{ width: `${matrixWidth}px` }}>
                      {monthAnchors.map((month) => (
                        <span
                          key={`month-${month.label}`}
                          className="absolute top-0"
                          style={{ left: `${month.weekIndex * (CELL_SIZE + CELL_GAP)}px` }}
                        >
                          {month.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-1 flex items-start gap-2">
                    <div className="relative w-8 h-[88px] shrink-0 text-xs text-[var(--text-secondary)]">
                      {DAY_ROW_LABELS.map((item) => (
                        <span
                          key={item.label}
                          className="absolute left-0"
                          style={{ top: `${item.row * (CELL_SIZE + CELL_GAP)}px` }}
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>

                    <div className="inline-flex gap-[3px]">
                      {yearContributions.map((week, index) => (
                        <div key={`week-${index}`} className="flex flex-col gap-[3px]">
                          {week.map((level, dayIndex) => (
                            <span
                              key={`cell-${index}-${dayIndex}`}
                              className="h-[10px] w-[10px] rounded-[2px]"
                              style={{ backgroundColor: contributionColor(level) }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

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
                  <p className="text-[var(--text-primary)]">
                    Contributed to <span className="text-[var(--text-link)]">Searching96/synergyit</span>,
                  </p>
                  <p className="text-[var(--text-link)]">ci-cd-demo-next-js</p>
                  <p className="mt-1">and 35 other repositories</p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="relative w-full max-w-[320px] h-[190px] text-[var(--text-secondary)]">
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 text-center text-sm">
                      {ACTIVITY_SPLIT.codeReview}%
                      <br />
                      Code review
                    </span>
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-center text-sm">
                      {ACTIVITY_SPLIT.commits}%
                      <br />
                      Commits
                    </span>
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-center text-sm">
                      {ACTIVITY_SPLIT.issues}%
                      <br />
                      Issues
                    </span>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-sm">
                      {ACTIVITY_SPLIT.pullRequests}%
                      <br />
                      Pull requests
                    </span>

                    <svg viewBox="0 0 180 180" className="absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2" role="img" aria-label="Activity distribution graph">
                      <line x1={activityGraphCenter} y1={18} x2={activityGraphCenter} y2={162} stroke="var(--border-default)" strokeWidth="2" />
                      <line x1={18} y1={activityGraphCenter} x2={162} y2={activityGraphCenter} stroke="var(--border-default)" strokeWidth="2" />

                      <line x1={activityGraphCenter} y1={activityGraphCenter} x2={activityGraphCenter} y2={topPointY} stroke="var(--accent-line)" strokeWidth="3" strokeLinecap="round" />
                      <line x1={activityGraphCenter} y1={activityGraphCenter} x2={rightPointX} y2={activityGraphCenter} stroke="var(--accent-line)" strokeWidth="3" strokeLinecap="round" />
                      <line x1={activityGraphCenter} y1={activityGraphCenter} x2={activityGraphCenter} y2={bottomPointY} stroke="var(--accent-line)" strokeWidth="3" strokeLinecap="round" />
                      <line x1={activityGraphCenter} y1={activityGraphCenter} x2={leftPointX} y2={activityGraphCenter} stroke="var(--accent-line)" strokeWidth="3" strokeLinecap="round" />

                      <polygon points={activityPolygonPoints} fill="none" stroke="var(--accent-line)" strokeWidth="2" />

                      <circle cx={leftPointX} cy={activityGraphCenter} r="3.5" fill="var(--surface-canvas)" stroke="var(--accent-line)" strokeWidth="2" />
                      <circle cx={activityGraphCenter} cy={topPointY} r="3.5" fill="var(--surface-canvas)" stroke="var(--accent-line)" strokeWidth="2" />
                      <circle cx={rightPointX} cy={activityGraphCenter} r="3.5" fill="var(--surface-canvas)" stroke="var(--accent-line)" strokeWidth="2" />
                      <circle cx={activityGraphCenter} cy={bottomPointY} r="3.5" fill="var(--surface-canvas)" stroke="var(--accent-line)" strokeWidth="2" />
                      <circle cx={activityGraphCenter} cy={activityGraphCenter} r="3.5" fill="var(--surface-canvas)" stroke="var(--accent-line)" strokeWidth="2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3 text-sm text-[var(--text-secondary)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Contribution activity</h3>
            <div className="border border-[var(--border-default)] rounded-md p-4 bg-[var(--surface-canvas)] space-y-4">
              <div>
                <p className="text-[var(--text-primary)]">April 2026</p>
                <p className="mt-1">Created 21 commits in 2 repositories</p>
                <p className="text-[var(--text-link)] mt-1">Searching96/synergyit</p>
                <p className="text-[var(--text-link)]">Searching96/htmlol</p>
              </div>
              <button type="button" className="w-full h-8 rounded-md border border-[var(--border-default)] text-xs text-[var(--text-link)] hover:bg-[var(--surface-subtle)]">
                Show more activity
              </button>
            </div>
          </section>
        </div>

        <div className="w-full lg:w-[100px] rounded-md bg-[var(--surface-canvas)] overflow-hidden text-sm text-[var(--text-secondary)]">
          {AVAILABLE_YEARS.map((year) => {
            const active = selectedYear === year;
            return (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear((prev) => (prev === year ? null : year))}
                className={`w-full h-10 px-3 text-left ${active ? "bg-[var(--text-link)] text-[var(--text-on-accent)] font-medium" : "hover:bg-[var(--surface-subtle)]"}`}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

