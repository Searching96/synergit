import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { ProfileActivitySnapshot } from "../../../types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DAY_ROW_LABELS: Array<{ label: string; row: number }> = [
  { label: "Mon", row: 1 },
  { label: "Wed", row: 3 },
  { label: "Fri", row: 5 },
];

const DEFAULT_CELL_GAP = 1.5;
const MONTH_LABEL_MIN_GAP_PX = 24;

type MonthAnchor = {
  label: string;
  weekIndex: number;
};

type ContributionCell = {
  level: number;
  date: string | null;
  contributionCount: number;
};

type ContributionCalendar = {
  weeks: ContributionCell[][];
  monthAnchors: MonthAnchor[];
  totalContributions: number;
};

type ContributionTooltipState = {
  text: string;
  x: number;
  y: number;
} | null;

interface ContributionMatrixProps {
  contributionDays: ProfileActivitySnapshot["contribution_days"];
  selectedYear: number;
  isRollingLast365: boolean;
  totalContributions: number;
  contributionColor: (level: number) => string;
}

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

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function contributionLevel(contributionCount: number, maxContributionCount: number): number {
  if (contributionCount <= 0) {
    return 0;
  }

  if (maxContributionCount <= 1) {
    return 1;
  }

  const levelOneMax = Math.max(1, Math.ceil(maxContributionCount * 0.25));
  const levelTwoMax = Math.max(levelOneMax + 1, Math.ceil(maxContributionCount * 0.5));
  const levelThreeMax = Math.max(levelTwoMax + 1, Math.ceil(maxContributionCount * 0.75));

  if (contributionCount <= levelOneMax) {
    return 1;
  }
  if (contributionCount <= levelTwoMax) {
    return 2;
  }
  if (contributionCount <= levelThreeMax) {
    return 3;
  }

  return 4;
}

function buildMonthAnchors(calendarStart: Date, weekCount: number): MonthAnchor[] {
  const monthAnchors: MonthAnchor[] = [];
  let previousMonth = -1;

  // A column belongs to the month of its first cell (the Sunday at the top of
  // the column). The label for a month is placed on the first column that
  // belongs to it.
  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const columnStart = addDays(calendarStart, weekIndex * 7);
    const month = columnStart.getMonth();

    if (month !== previousMonth) {
      monthAnchors.push({ label: MONTH_LABELS[month], weekIndex });
      previousMonth = month;
    }
  }

  return monthAnchors;
}

function buildContributionCalendar(
  rangeStart: Date,
  rangeEnd: Date,
  dayContributionCount: Map<string, number>,
): ContributionCalendar {
  const startDate = atStartOfDay(rangeStart);
  const endDate = atStartOfDay(rangeEnd);
  const calendarStart = startOfWeek(startDate);
  const calendarEnd = endOfWeek(endDate);

  const maxContributionCount = Array.from(dayContributionCount.values()).reduce(
    (maxValue, value) => Math.max(maxValue, value),
    0,
  );

  const weeks: ContributionCell[][] = [];
  let currentWeek: ContributionCell[] = [];
  let totalContributions = 0;

  for (let cursor = new Date(calendarStart); cursor <= calendarEnd; cursor = addDays(cursor, 1)) {
    const inRange = cursor >= startDate && cursor <= endDate;
    let level = 0;

    if (inRange) {
      const count = dayContributionCount.get(toDateKey(cursor)) ?? 0;
      level = contributionLevel(count, maxContributionCount);
      totalContributions += count;

      currentWeek.push({
        level,
        date: toDateKey(cursor),
        contributionCount: count,
      });
    } else {
      currentWeek.push({
        level,
        date: null,
        contributionCount: 0,
      });
    }

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return {
    weeks,
    monthAnchors: buildMonthAnchors(calendarStart, weeks.length),
    totalContributions,
  };
}

function formatContributionTooltip(dateKey: string | null, contributionCount: number): string {
  if (!dateKey) {
    return "No contributions";
  }

  const parsedDate = new Date(`${dateKey}T00:00:00Z`);
  const formattedDate = parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const noun = contributionCount === 1 ? "contribution" : "contributions";
  return `${contributionCount} ${noun} on ${formattedDate}`;
}

export default function ContributionMatrix({
  contributionDays,
  selectedYear,
  isRollingLast365,
  totalContributions,
  contributionColor,
}: ContributionMatrixProps) {
  const matrixHostRef = useRef<HTMLDivElement | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<ContributionTooltipState>(null);

  const dayContributionCount = useMemo(() => {
    const countByDay = new Map<string, number>();

    for (const day of contributionDays) {
      countByDay.set(day.date, day.commit_count);
    }

    return countByDay;
  }, [contributionDays]);

  const { weeks, monthAnchors } = useMemo(() => {
    if (isRollingLast365) {
      const today = atStartOfDay(new Date());
      return buildContributionCalendar(
        addDays(today, -364),
        today,
        dayContributionCount,
      );
    }

    return buildContributionCalendar(
      new Date(selectedYear, 0, 1),
      new Date(selectedYear, 11, 31),
      dayContributionCount,
    );
  }, [dayContributionCount, isRollingLast365, selectedYear]);

  const weekCount = weeks.length;

  useEffect(() => {
    setHoveredTooltip(null);
  }, [contributionDays, selectedYear, isRollingLast365]);

  const [matrixHostWidth, setMatrixHostWidth] = useState(0);

  useEffect(() => {
    const host = matrixHostRef.current;
    if (!host) return;
    const update = () => setMatrixHostWidth(host.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [weekCount]);

  const labelColumnWidth = 40;
  const matrixGap = DEFAULT_CELL_GAP;
  const availableWidth = matrixHostWidth - labelColumnWidth;
  const cellSize = weekCount > 0 && availableWidth > 0
    ? Math.max(2, Math.floor((availableWidth - Math.max(weekCount - 1, 0) * matrixGap) / weekCount))
    : 10;

  const matrixWidth = weekCount * cellSize + Math.max(weekCount - 1, 0) * matrixGap;
  const matrixHeight = 7 * cellSize + 6 * matrixGap;

  const displayMonthAnchors = useMemo(() => {
    const visible: Array<MonthAnchor & { left: number }> = [];

    for (const anchor of monthAnchors) {
      const left = anchor.weekIndex * (cellSize + matrixGap);
      const previous = visible[visible.length - 1];

      if (!previous || left - previous.left >= MONTH_LABEL_MIN_GAP_PX) {
        visible.push({ ...anchor, left });
      }
    }

    return visible;
  }, [cellSize, matrixGap, monthAnchors]);

  const handleCellMouseEnter = (event: MouseEvent<HTMLSpanElement>, cell: ContributionCell) => {
    if (!cell.date || !matrixHostRef.current) {
      setHoveredTooltip(null);
      return;
    }

    const cellRect = event.currentTarget.getBoundingClientRect();

    setHoveredTooltip({
      text: formatContributionTooltip(cell.date, cell.contributionCount),
      x: cellRect.left + cellRect.width / 2,
      y: cellRect.top - 8,
    });
  };

  const handleCellMouseLeave = () => {
    setHoveredTooltip(null);
  };

  return (
    <>
      <p className="text-sm text-[var(--text-secondary)] mb-3">
        <span className="font-semibold text-[var(--text-primary)]">{totalContributions.toLocaleString()} contributions</span>{" "}
        {isRollingLast365 ? "in the last year" : `in ${selectedYear}`}
      </p>
      <section className="border border-[var(--border-default)] rounded-t-md bg-[var(--surface-canvas)] overflow-hidden p-4">
      <div>
        <div ref={matrixHostRef} className="relative w-full overflow-x-auto overflow-y-visible" onMouseLeave={handleCellMouseLeave}>
          {hoveredTooltip ? (
            <div
              className="pointer-events-none fixed z-[999] -translate-x-1/2 -translate-y-full rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] px-2 py-1 text-xs text-[var(--text-primary)] shadow whitespace-nowrap"
              style={{ left: `${hoveredTooltip.x}px`, top: `${hoveredTooltip.y}px` }}
            >
              {hoveredTooltip.text}
            </div>
          ) : null}

          <div className="pl-10">
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
                  className="absolute left-0 leading-none"
                  style={{ top: `${item.row * (cellSize + matrixGap)}px`, height: `${cellSize}px`, display: "flex", alignItems: "center" }}
                >
                  {item.label}
                </span>
              ))}
            </div>

            <div className="inline-flex shrink-0" style={{ gap: `${matrixGap}px`, width: `${matrixWidth}px` }}>
              {weeks.map((week, index) => (
                <div key={`week-${index}`} className="flex flex-col" style={{ gap: `${matrixGap}px`, width: `${cellSize}px` }}>
                  {week.map((cell, dayIndex) => (
                    <span
                      key={`cell-${index}-${dayIndex}`}
                      className="rounded-[2px] cursor-default"
                      title={cell.date ? formatContributionTooltip(cell.date, cell.contributionCount) : undefined}
                      onMouseEnter={cell.date ? (event) => handleCellMouseEnter(event, cell) : undefined}
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        backgroundColor: cell.date ? contributionColor(cell.level) : "transparent",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 px-4 text-xs text-[var(--text-secondary)] flex items-center justify-between">
        <span>Learn how we count contributions</span>
        <div className="inline-flex items-center gap-2">
          <span>Less</span>
          <div className="inline-flex" style={{ gap: `${matrixGap}px` }}>
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={`legend-${level}`} className="rounded-[2px]" style={{ width: `${cellSize}px`, height: `${cellSize}px`, backgroundColor: contributionColor(level) }} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
      </section>
    </>
  );
}
