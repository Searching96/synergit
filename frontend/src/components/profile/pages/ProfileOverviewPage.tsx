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

const MONTH_LABELS = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

const DAY_ROW_LABELS: Array<{ label: string; row: number }> = [
  { label: "Mon", row: 1 },
  { label: "Wed", row: 3 },
  { label: "Fri", row: 5 },
];

const AVAILABLE_YEARS = [2026, 2025, 2024];
const DAY_MS = 24 * 60 * 60 * 1000;
const CELL_SIZE = 10;
const CELL_GAP = 3;

function mapSeedToContributionLevel(seedValue: number, dayOfYear: number, year: number): number {
  const score = (seedValue + dayOfYear * 7 + year) % 10;
  if (score < 3) return 0;
  if (score < 5) return 1;
  if (score < 7) return 2;
  if (score < 9) return 3;
  return 4;
}

function buildContributionCalendar(year: number, seedLevels: number[]) {
  const firstDayOfYear = new Date(year, 0, 1);
  const lastDayOfYear = new Date(year, 11, 31);

  const calendarStart = new Date(firstDayOfYear);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());

  const calendarEnd = new Date(lastDayOfYear);
  calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));

  const safeSeed = seedLevels.length > 0 ? seedLevels : [0, 1, 2, 3, 4, 2, 1];
  const weeks: number[][] = [];
  let currentWeek: number[] = [];

  for (let cursor = new Date(calendarStart); cursor <= calendarEnd; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor);
    const inSelectedYear = date.getFullYear() === year;

    let level = 0;
    if (inSelectedYear) {
      const dayOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / DAY_MS);
      const seedValue = safeSeed[(dayOfYear + year) % safeSeed.length] ?? 0;
      level = mapSeedToContributionLevel(seedValue, dayOfYear, year);
    }

    currentWeek.push(level);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  const monthAnchors = MONTH_LABELS.map((label, monthIndex) => {
    const monthStart = new Date(year, monthIndex, 1);
    const dayOffset = Math.floor((monthStart.getTime() - calendarStart.getTime()) / DAY_MS);
    return {
      label,
      weekIndex: Math.floor(dayOffset / 7),
    };
  }).filter((item, index, array) => index === 0 || item.weekIndex !== array[index - 1].weekIndex);

  return { weeks, monthAnchors };
}

export default function ProfileOverviewPage({
  pinnedRepositories,
  contributions,
  onOpenWorkspace,
  languageColor,
  contributionColor,
}: ProfileOverviewPageProps) {
  const [selectedYear, setSelectedYear] = useState<number>(AVAILABLE_YEARS[0]);

  const contributionSeed = useMemo(
    () => contributions.flat().map((level) => Math.min(4, Math.max(0, level))),
    [contributions],
  );

  const { weeks: yearContributions, monthAnchors } = useMemo(
    () => buildContributionCalendar(selectedYear, contributionSeed),
    [selectedYear, contributionSeed],
  );

  const matrixWidth = yearContributions.length * (CELL_SIZE + CELL_GAP);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#24292f]">Pinned</h2>
          <button type="button" className="text-xs text-[#0969da] hover:underline">Customize your pins</button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {pinnedRepositories.map((repo) => (
            <article key={`pin-${repo.name}`} className="border border-[#d1d9e0] rounded-md p-4 bg-white">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenWorkspace(repo.name)}
                  className="text-sm font-semibold text-[#0969da] hover:underline inline-flex items-center gap-2"
                >
                  <Book size={14} className="text-[#57606a]" />
                  {repo.name}
                </button>
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-[#d1d9e0] text-[#57606a]">
                  {repo.visibility}
                </span>
              </div>
              <p className="mt-3 text-sm text-[#57606a] min-h-[36px]">{repo.description || "No description provided."}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-[#57606a]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} />
                {repo.language}
              </div>
            </article>
          ))}
        </div>
      </section>
      
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_100px] gap-6 items-start">
        <div className="space-y-6">
          <section className="border border-[#d1d9e0] rounded-md bg-white overflow-hidden">
            <div className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <p className="text-sm text-[#57606a]">
                  <span className="font-semibold text-[#24292f]">1,134 contributions</span> in the last year
                </p>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-stretch">
                  <button type="button" className="text-xs text-[#57606a] hover:text-[#24292f]">
                    Contribution settings ▼
                  </button>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="pl-10 pr-2">
                    <div className="relative h-4 text-xs text-[#57606a]" style={{ width: `${matrixWidth}px` }}>
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
                    <div className="relative w-8 h-[88px] shrink-0 text-xs text-[#57606a]">
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

              <div className="mt-4 text-xs text-[#57606a] flex items-center justify-between">
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

            <div className="border-t border-[#d8dee4] p-4">
              <h3 className="text-base font-semibold text-[#24292f]">Activity overview</h3>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] gap-6">
                <div className="text-sm text-[#57606a] lg:pr-8 lg:border-r lg:border-[#d8dee4]">
                  <p className="text-[#24292f]">
                    Contributed to <span className="text-[#0969da]">Searching96/synergyit</span>,
                  </p>
                  <p className="text-[#0969da]">ci-cd-demo-next-js</p>
                  <p className="mt-1">and 35 other repositories</p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="relative w-full max-w-[300px] h-[180px] text-[#57606a]">
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 text-sm">Code review</span>
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm">97%<br />Commits</span>
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm">Issues</span>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm text-center">3%<br />Pull requests</span>

                    <div className="absolute left-1/2 top-8 bottom-8 w-[2px] bg-[#1f883d] -translate-x-1/2" />
                    <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-[#1f883d] -translate-y-1/2" />
                    <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1f883d] bg-white" />
                    <span className="absolute left-[28%] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-[#1f883d] bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3 text-sm text-[#57606a]">
            <h3 className="text-base font-semibold text-[#24292f]">Contribution activity</h3>
            <div className="border border-[#d1d9e0] rounded-md p-4 bg-white space-y-4">
              <div>
                <p className="text-[#24292f]">April 2026</p>
                <p className="mt-1">Created 21 commits in 2 repositories</p>
                <p className="text-[#0969da] mt-1">Searching96/synergyit</p>
                <p className="text-[#0969da]">Searching96/htmlol</p>
              </div>
              <button type="button" className="w-full h-8 rounded-md border border-[#d1d9e0] text-xs text-[#0969da] hover:bg-[#f6f8fa]">
                Show more activity
              </button>
            </div>
          </section>
        </div>

        <div className="w-full lg:w-[100px] rounded-md bg-white overflow-hidden text-sm text-[#57606a]">
          {AVAILABLE_YEARS.map((year) => {
            const active = selectedYear === year;
            return (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={`w-full h-10 px-3 text-left ${active ? "bg-[#0969da] text-white font-medium" : "hover:bg-[#f6f8fa]"}`}
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
