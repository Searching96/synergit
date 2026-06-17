import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  GearIcon,
  GitMergeIcon,
  GitPullRequestIcon,
  IssueClosedIcon,
  IssueOpenedIcon,
  KebabHorizontalIcon,
  CheckIcon,
  RepoForkedIcon,
} from "@primer/octicons-react";
import type { ContributionWeek, RepoContributorsSnapshot, RepoPulseSnapshot } from "../../../types";
import { reposApi } from "../../../services/api";
import { Tooltip } from "../../shared/Tooltip";
import { SpinnerPlaceholder, TextSkeleton } from "../../shared/LoadingPlaceholders";
import type { RepoContentKind } from "../../../utils/repoRouting";
import { buildContributorsDefaultSearch, formatGitHubDate, normalizeContributorsSearch } from "../../../utils/repoRouting";

interface RepoInsightsProps {
  repoId: string;
  repoOwner?: string;
  repoName?: string;
  contentKind: RepoContentKind;
  locationSearch: string;
  onOpenPulse: () => void;
  onOpenContributors: () => void;
  onOpenContributorsPeriod: (search: string) => void;
}

const INSIGHTS_NAV_ITEMS = [
  "Pulse",
  "Contributors",
  "Community standards",
  "Commits",
  "Code frequency",
  "Dependency graph",
  "Network",
  "Forks",
  "Actions usage metrics",
  "Actions performance metrics",
];

const PULSE_PERIOD_OPTIONS = [
  { value: "24h", label: "24 hours" },
  { value: "3d", label: "3 days" },
  { value: "1w", label: "1 week" },
  { value: "1m", label: "1 month" },
];

const CONTRIBUTORS_PERIOD_OPTIONS = [
  { value: "all", label: "All" },
  { value: "1m", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
];

const formatLongDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatNumber = (value: number) => value.toLocaleString("en-US");

const pluralize = (count: number, singular: string, plural: string = `${singular}s`) => {
  return count === 1 ? singular : plural;
};

export default function RepoInsights(props: RepoInsightsProps) {
  if (props.contentKind === "contributors") {
    return <RepoContributorsInsights {...props} />;
  }

  return <RepoPulseInsights {...props} />;
}

function RepoPulseInsights({ repoId, repoOwner, repoName, onOpenPulse, onOpenContributors }: RepoInsightsProps) {
  const [pulse, setPulse] = useState<RepoPulseSnapshot | null>(null);
  const [period, setPeriod] = useState<string>("1m");
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPulse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await reposApi.getPulse(repoId, period);
      setPulse(snapshot);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pulse");
    } finally {
      setLoading(false);
    }
  }, [period, repoId]);

  useEffect(() => {
    void loadPulse();
  }, [loadPulse]);

  const maxCommitCount = useMemo(() => {
    if (!pulse || pulse.top_committers.length === 0) return 1;
    return Math.max(...pulse.top_committers.map((item) => item.commit_count), 1);
  }, [pulse]);

  const chartScaleMax = useMemo(() => {
    if (maxCommitCount <= 40) return 40;
    if (maxCommitCount <= 100) return 100;
    return Math.ceil(maxCommitCount / 100) * 100;
  }, [maxCommitCount]);
  const chartTicks = useMemo(
    () => [
      { value: chartScaleMax, top: 0 },
      { value: Math.round(chartScaleMax / 2), top: 50 },
      { value: 0, top: 100 },
    ],
    [chartScaleMax],
  );

  const pullTotal = Math.max(
    (pulse?.overview.merged_pull_requests || 0) + (pulse?.overview.open_pull_requests || 0),
    1,
  );
  const issueTotal = Math.max(
    (pulse?.overview.closed_issues || 0) + (pulse?.overview.new_issues || 0),
    1,
  );

  const defaultBranch = pulse?.default_branch || "master";
  const selectedPeriod = PULSE_PERIOD_OPTIONS.find((item) => item.value === period) || PULSE_PERIOD_OPTIONS[3];
  const periodRange = pulse && !loading
    ? `${formatLongDate(pulse.period_start)} - ${formatLongDate(pulse.period_end)}`
    : "";
  const headerTitle = loading ? "" : periodRange || "Pulse";
  const hasCommitActivity = Boolean(
    pulse && (pulse.summary.all_branch_commit_count > 0 || pulse.top_committers.length > 0),
  );
  const repoFullName = repoOwner && repoName ? `${repoOwner}/${repoName}` : repoName || "this repository";

  return (
    <div className="mx-auto mt-7 grid w-full max-w-[1368px] grid-cols-1 gap-[27px] lg:grid-cols-[333px_minmax(0,1fr)]">
      <InsightsSidebar activeItem="Pulse" onOpenPulse={onOpenPulse} onOpenContributors={onOpenContributors} />

      <section className="min-w-0">
        <div className="mb-[17px] pb-2 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3">
          <h2 className="min-h-9 text-[24px] font-semibold leading-9 text-[var(--text-primary)]">
            {headerTitle}
          </h2>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPeriodMenuOpen((open) => !open)}
              className="inline-flex h-[37px] items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-[14px] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)]"
              aria-haspopup="menu"
              aria-expanded={isPeriodMenuOpen}
            >
              <span className="text-[var(--text-secondary)]">Period:</span>
              <span>{selectedPeriod.label}</span>
              <ChevronDownIcon size={16} className="ml-1 text-[var(--text-secondary)]" />
            </button>
            {isPeriodMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 w-[216px] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] py-2 shadow-lg"
              >
                {PULSE_PERIOD_OPTIONS.map((option) => {
                  const isSelected = option.value === period;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setPeriod(option.value);
                        setIsPeriodMenuOpen(false);
                      }}
                      className="flex h-9 w-full items-center gap-3 px-5 text-left text-base text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                    >
                      <span className="inline-flex w-4 justify-center text-[var(--text-secondary)]">
                        {isSelected ? <CheckIcon size={16} /> : null}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <PulseLoadingLayout />
        ) : error ? (
          <div className="rounded-md border border-[var(--border-danger-soft)] bg-[var(--surface-danger-subtle)] p-6 text-sm text-[var(--text-danger)]">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              onClick={() => void loadPulse()}
              className="mt-3 h-8 rounded-md border border-[var(--border-danger-muted)] bg-[var(--surface-canvas)] px-3 font-semibold hover:bg-[var(--surface-danger-subtle)]"
            >
              Retry
            </button>
          </div>
        ) : pulse ? (
          <div className="space-y-[27px]">
            <div className="overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)]">
              <div className="h-[60px] border-b border-[var(--border-default)] bg-[var(--surface-subtle)] px-[18px] text-base font-semibold leading-[60px] text-[var(--text-primary)]">
                Overview
              </div>

              <div className="grid grid-cols-1 gap-[37px] px-[18px] py-[26px] md:grid-cols-2">
                <div>
                  <div className="flex h-[9px] overflow-hidden rounded-[2px] bg-[#d0d7de]">
                    <div
                      className="h-full bg-[#8250df]"
                      style={{ width: `${Math.round((pulse.overview.merged_pull_requests / pullTotal) * 100)}%` }}
                    />
                    <div
                      className="h-full bg-[#1a7f37]"
                      style={{ width: `${Math.round((pulse.overview.open_pull_requests / pullTotal) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-[11px] text-base text-[var(--text-primary)]">
                    {formatNumber(pulse.overview.active_pull_requests)} Active pull requests
                  </p>
                </div>
                <div>
                  <div className="flex h-[9px] overflow-hidden rounded-[2px] bg-[#d0d7de]">
                    <div
                      className="h-full bg-[#cf222e]"
                      style={{ width: `${Math.round((pulse.overview.closed_issues / issueTotal) * 100)}%` }}
                    />
                    <div
                      className="h-full bg-[#1a7f37]"
                      style={{ width: `${Math.round((pulse.overview.new_issues / issueTotal) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-[11px] text-base text-[var(--text-primary)]">
                    {formatNumber(pulse.overview.active_issues)} Active issues
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 border-t border-[var(--border-default)] lg:grid-cols-4">
                <PulseMetric
                  icon={<GitMergeIcon size={18} />}
                  iconClassName="text-[#8250df]"
                  value={pulse.overview.merged_pull_requests}
                  label="Merged pull requests"
                />
                <PulseMetric
                  icon={<GitPullRequestIcon size={18} />}
                  iconClassName="text-[#1a7f37]"
                  value={pulse.overview.open_pull_requests}
                  label="Open pull requests"
                />
                <PulseMetric
                  icon={<IssueClosedIcon size={18} />}
                  iconClassName="text-[#8250df]"
                  value={pulse.overview.closed_issues}
                  label="Closed issues"
                />
                <PulseMetric
                  icon={<IssueOpenedIcon size={18} />}
                  iconClassName="text-[#1a7f37]"
                  value={pulse.overview.new_issues}
                  label="New issues"
                  isLast
                />
              </div>
            </div>

            {hasCommitActivity ? (
              <PulseActivityDetails
                pulse={pulse}
                defaultBranch={defaultBranch}
                chartTicks={chartTicks}
                chartScaleMax={chartScaleMax}
              />
            ) : (
              <PulseNoCommitActivity repoFullName={repoFullName} periodLabel={pulse.period_label} />
            )}
          </div>
        ) : (
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-8 text-center text-sm text-[var(--text-secondary)]">
            No pulse data available.
          </div>
        )}
      </section>
    </div>
  );
}

function RepoContributorsInsights({
  repoId,
  locationSearch,
  onOpenPulse,
  onOpenContributors,
  onOpenContributorsPeriod,
}: RepoInsightsProps) {
  const [snapshot, setSnapshot] = useState<RepoContributorsSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState<boolean>(false);
  const [isContributionsMenuOpen, setIsContributionsMenuOpen] = useState<boolean>(false);

  const period = useMemo(() => getContributorsPeriodFromSearch(locationSearch), [locationSearch]);
  const selectedPeriod = CONTRIBUTORS_PERIOD_OPTIONS.find((item) => item.value === period) || CONTRIBUTORS_PERIOD_OPTIONS[2];

  const loadContributors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextSnapshot = await reposApi.getContributors(repoId, period);
      setSnapshot(nextSnapshot);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load contributors");
    } finally {
      setLoading(false);
    }
  }, [period, repoId]);

  useEffect(() => {
    void loadContributors();
  }, [loadContributors]);

  const defaultBranch = snapshot?.default_branch || "master";

  return (
    <div className="mx-auto mt-7 grid w-full max-w-[1368px] grid-cols-1 gap-[27px] lg:grid-cols-[333px_minmax(0,1fr)]">
      <InsightsSidebar activeItem="Contributors" onOpenPulse={onOpenPulse} onOpenContributors={onOpenContributors} />

      <section className="min-w-0">
        <div className="mb-[28px] flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[28px] font-semibold leading-8 text-[var(--text-primary)]">Contributors</h2>
            <p className="mt-2 text-base text-[var(--text-secondary)]">
              Contributions per week to {defaultBranch}, excluding merge commits
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPeriodMenuOpen((open) => !open)}
                className="inline-flex h-[37px] items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-[14px] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)]"
                aria-haspopup="menu"
                aria-expanded={isPeriodMenuOpen}
              >
                <span>Period: {selectedPeriod.label}</span>
                <ChevronDownIcon size={16} className="ml-1 text-[var(--text-secondary)]" />
              </button>
              {isPeriodMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1 w-[216px] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] py-2 shadow-lg"
                >
                  {CONTRIBUTORS_PERIOD_OPTIONS.map((option) => {
                    const isSelected = option.value === period;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setIsPeriodMenuOpen(false);
                          onOpenContributorsPeriod(buildContributorsSearchForPeriod(option.value));
                        }}
                        className="flex h-9 w-full items-center gap-3 px-5 text-left text-base text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                      >
                        <span className="inline-flex w-4 justify-center text-[var(--text-secondary)]">
                          {isSelected ? <CheckIcon size={16} /> : null}
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsContributionsMenuOpen((open) => !open)}
                className="inline-flex h-[37px] items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-[14px] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)]"
                aria-haspopup="menu"
                aria-expanded={isContributionsMenuOpen}
              >
                <span>Contributions: Commits</span>
                <ChevronDownIcon size={16} className="ml-1 text-[var(--text-secondary)]" />
              </button>
              {isContributionsMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1 w-[216px] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] py-2 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked="true"
                    onClick={() => setIsContributionsMenuOpen(false)}
                    className="flex h-9 w-full items-center gap-3 px-5 text-left text-base text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                  >
                    <span className="inline-flex w-4 justify-center text-[var(--text-secondary)]">
                      <CheckIcon size={16} />
                    </span>
                    <span>Commits</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <RepoContributorsLoading />
        ) : error ? (
          <div className="rounded-md border border-[var(--border-danger-soft)] bg-[var(--surface-danger-subtle)] p-6 text-sm text-[var(--text-danger)]">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              onClick={() => void loadContributors()}
              className="mt-3 h-8 rounded-md border border-[var(--border-danger-muted)] bg-[var(--surface-canvas)] px-3 font-semibold hover:bg-[var(--surface-danger-subtle)]"
            >
              Retry
            </button>
          </div>
        ) : snapshot ? (
          <div className="space-y-[18px]">
            <ContributorsChartCard snapshot={snapshot} />
            <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
              {snapshot.contributors.map((contributor, index) => (
                <ContributorCard
                  key={contributor.author_name}
                  contributor={contributor}
                  rank={index + 1}
                  periodStart={snapshot.period_start}
                  periodEnd={snapshot.period_end}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-8 text-center text-sm text-[var(--text-secondary)]">
            No contributor data available.
          </div>
        )}
      </section>
    </div>
  );
}

function RepoContributorsLoading() {
  return (
    <div className="space-y-[18px]">
      <article className="min-h-[396px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-[18px]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold leading-6 text-[var(--text-primary)]">Commits over time</h3>
            <TextSkeleton className="mt-2 w-[260px]" lines={1} lineClassName="h-4" />
          </div>
          <PulseTopCommittersHeaderActions />
        </div>
        <SpinnerPlaceholder className="h-[300px]" label="Loading contributor chart" size={34} />
      </article>
    </div>
  );
}

function InsightsSidebar({
  activeItem,
  onOpenPulse,
  onOpenContributors,
}: {
  activeItem: string;
  onOpenPulse: () => void;
  onOpenContributors: () => void;
}) {
  return (
    <aside className="h-fit overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)]">
      {INSIGHTS_NAV_ITEMS.map((item) => {
        const isActive = item === activeItem;
        const onClick = item === "Pulse" ? onOpenPulse : item === "Contributors" ? onOpenContributors : undefined;
        return (
          <button
            key={item}
            type="button"
            onClick={onClick}
            className={`block h-[43px] w-full border-b border-[var(--border-default)] px-[17px] text-left text-base leading-[43px] last:border-b-0 ${
              isActive
                ? "border-l-2 border-l-[#fd8c73] bg-[var(--surface-canvas)] pl-[16px] font-normal text-[var(--text-primary)]"
                : "text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            {item}
          </button>
        );
      })}
    </aside>
  );
}

function ContributorsChartCard({ snapshot }: { snapshot: RepoContributorsSnapshot }) {
  const maxCount = Math.max(...snapshot.weekly_totals.map((week) => week.commit_count), 1);
  const chartMax = maxCount <= 30 ? 30 : Math.ceil(maxCount / 10) * 10;
  const rangeLabel = buildWeeklyRangeLabel(snapshot.weekly_totals, snapshot.period_start, snapshot.period_end);

  return (
    <article className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-[18px]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold leading-6 text-[var(--text-primary)]">Commits over time</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{rangeLabel}</p>
        </div>
        <PulseTopCommittersHeaderActions />
      </div>
      <ContributionBars
        weeks={snapshot.weekly_totals}
        chartMax={chartMax}
        heightClassName="h-[170px]"
        periodStart={snapshot.period_start}
        periodEnd={snapshot.period_end}
        showAxis
      />
      <ContributionMiniTimeline weeks={snapshot.weekly_totals} />
    </article>
  );
}

function ContributionBars({
  weeks,
  chartMax,
  heightClassName,
  periodStart,
  periodEnd,
  showAxis = false,
}: {
  weeks: ContributionWeek[];
  chartMax: number;
  heightClassName: string;
  periodStart: string;
  periodEnd: string;
  showAxis?: boolean;
}) {
  const tickValues = [chartMax, Math.round(chartMax / 2), 0];
  const timeline = buildContributionTimeline(weeks, periodStart, periodEnd);

  return (
    <div className="mt-7 grid grid-cols-[minmax(0,1fr)_42px] gap-1">
      <div className={`relative ${heightClassName} border-b border-[#d8dee4]`}>
        {[0, 50, 100].map((top) => (
          <div
            key={top}
            className={`absolute inset-x-0 border-t ${top === 100 ? "border-[#d8dee4]" : "border-dashed border-[#d8dee4]"}`}
            style={{ top: `${top}%` }}
          />
        ))}
        {timeline.labels.map((label) => (
          <div
            key={label.week_start}
            className="absolute bottom-0 top-0 border-l border-dashed border-[#d8dee4]"
            style={{ left: `${label.left}%` }}
          />
        ))}
        <div className="absolute inset-0">
          {timeline.bars.map((week) => {
            const height = week.commit_count > 0 ? Math.max((week.commit_count / chartMax) * 100, 2) : 0;
            return (
              <div
                key={week.week_start}
                className="group absolute bottom-0 flex h-full items-end"
                style={{ left: `${week.left}%`, width: `${week.width}%` }}
              >
                {week.showHoverMarker && (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 hidden w-px -translate-x-1/2 bg-[#0969da]/35 group-hover:block group-focus-within:block"
                    style={{ left: `${week.markerLeft}%` }}
                  />
                )}
                <InsightBarTooltip week={week} heightPercent={height} tooltipDate={week.sundayDate} />
              </div>
            );
          })}
        </div>
        {showAxis && (
          <span className="absolute right-[-72px] top-1/2 -translate-y-1/2 rotate-90 origin-center text-xs text-[var(--text-secondary)]">Contributions</span>
        )}
        <div className="absolute inset-x-0 top-full mt-4 h-4 text-xs text-[var(--text-secondary)]">
          {timeline.labels.map((week) => (
            <span
              key={week.week_start}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${week.left}%` }}
            >
              {formatShortWeekLabel(week.week_start)}
            </span>
          ))}
        </div>
      </div>
      {showAxis && (
        <div className={`relative ${heightClassName} text-xs text-[var(--text-secondary)]`}>
          {tickValues.map((value, index) => (
            <span
              key={`${value}-${index}`}
              className="absolute left-0 -translate-y-1/2"
              style={{ top: `${index * 50}%` }}
            >
              {formatNumber(value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function buildContributionTimeline(weeks: ContributionWeek[], periodStart: string, periodEnd: string) {
  const start = startOfDay(new Date(periodStart));
  const end = startOfDay(new Date(periodEnd));
  const firstLabel = firstMondayOnOrAfter(start);
  const labelLimit = new Date(end);
  labelLimit.setDate(labelLimit.getDate() + 1);
  const lastLabel = lastMondayOnOrBefore(labelLimit);
  const chartStart = new Date(firstLabel);
  chartStart.setDate(chartStart.getDate() - 7);
  const chartEnd = new Date(lastLabel);
  chartEnd.setDate(chartEnd.getDate() + 3);
  const totalDays = Math.max(daysBetween(chartStart, chartEnd), 1);
  const bars = weeks
    .map((week) => {
      const mondayDate = startOfDay(new Date(week.week_start));
      const sundayDate = new Date(mondayDate);
      sundayDate.setDate(sundayDate.getDate() - 1);
      const barStart = new Date(sundayDate);
      barStart.setDate(barStart.getDate() - 3);
      const barEnd = new Date(sundayDate);
      barEnd.setDate(barEnd.getDate() + 4);
      const visibleStart = barStart < chartStart ? chartStart : barStart;
      const visibleEnd = barEnd > chartEnd ? chartEnd : barEnd;
      const visibleDays = Math.max(daysBetween(visibleStart, visibleEnd), week.commit_count > 0 ? 1 : 0);
      const left = clampPercent((daysBetween(chartStart, visibleStart) / totalDays) * 100);
      const width = clampPercent((visibleDays / totalDays) * 100);
      const centerLeft = clampPercent((daysBetween(chartStart, sundayDate) / totalDays) * 100);
      const markerLeft = width > 0 ? clampPercent(((centerLeft - left) / width) * 100) : 0;
      const sundayVisible = sundayDate >= visibleStart && sundayDate <= visibleEnd;
      const showHoverMarker = sundayVisible && visibleDays >= 4;
      return {
        ...week,
        sundayDate: sundayDate.toISOString(),
        centerLeft,
        markerLeft,
        showHoverMarker,
        left,
        width,
      };
    })
    .filter((week) => week.width > 0);

  const labels: Array<{ week_start: string; left: number }> = [];
  for (const current = firstLabel; current <= lastLabel; current.setDate(current.getDate() + 7)) {
    labels.push({
      week_start: current.toISOString(),
      left: clampPercent((daysBetween(chartStart, current) / totalDays) * 100),
    });
  }

  return { bars, labels };
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function firstMondayOnOrAfter(value: Date): Date {
  const result = new Date(value);
  const offset = (8 - result.getDay()) % 7;
  result.setDate(result.getDate() + offset);
  return result;
}

function lastMondayOnOrBefore(value: Date): Date {
  const result = new Date(value);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  return result;
}

function clampPercent(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

function ContributionMiniTimeline({ weeks }: { weeks: ContributionWeek[] }) {
  return (
    <div className="mt-14 h-[60px] border-t border-[#8c959f]">
      <div className="relative mt-2 h-[36px] overflow-hidden bg-[#ddf4ff]">
        <svg className="h-full w-full" viewBox={`0 0 ${Math.max(weeks.length - 1, 1)} 36`} preserveAspectRatio="none" aria-hidden="true">
          <polyline
            fill="none"
            stroke="#0969da"
            strokeWidth="1.5"
            points={weeks.map((week, index) => `${index},${34 - Math.min(week.commit_count, 34)}`).join(" ")}
          />
        </svg>
      </div>
      <div className="mt-1 flex justify-around text-[10px] text-[var(--text-secondary)]">
        <span>{weeks[0] ? formatShortMonthLabel(weeks[0].week_start) : ""}</span>
        <span>{weeks[Math.floor(weeks.length / 2)] ? formatShortMonthLabel(weeks[Math.floor(weeks.length / 2)].week_start) : ""}</span>
        <span>{weeks[weeks.length - 1] ? formatShortMonthLabel(weeks[weeks.length - 1].week_start) : ""}</span>
      </div>
    </div>
  );
}

function InsightBarTooltip({
  week,
  heightPercent,
  tooltipDate,
}: {
  week: ContributionWeek;
  heightPercent: number;
  tooltipDate?: string;
}) {
  return (
    <div
      className="group relative w-full bg-[#0969da]"
      style={{ height: `${heightPercent}%` }}
      tabIndex={0}
    >
      <div
        className="h-full w-full"
      />
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-xs font-normal text-[var(--text-primary)] shadow-md group-hover:block group-focus:block">
        <div className="min-w-[124px]">
          <p className="mb-2 whitespace-nowrap">Week of {formatTooltipWeekLabel(tooltipDate || week.week_start)}</p>
          <div className="flex items-center justify-between gap-5">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-[#0969da]" />
              <span>Commits</span>
            </span>
            <span>{formatNumber(week.commit_count)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContributorCard({
  contributor,
  rank,
  periodStart,
  periodEnd,
}: {
  contributor: { author_name: string; commit_count: number; weeks: ContributionWeek[] };
  rank: number;
  periodStart: string;
  periodEnd: string;
}) {
  const maxCount = Math.max(...contributor.weeks.map((week) => week.commit_count), 1);
  const chartMax = maxCount <= 20 ? 20 : Math.ceil(maxCount / 10) * 10;

  return (
    <article className="min-h-[216px] w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-[16px] pb-[18px] pt-[18px]">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] text-center text-sm font-semibold leading-10 text-[var(--text-primary)]">
            {(contributor.author_name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold leading-6 text-[var(--text-link)]">{contributor.author_name}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {formatNumber(contributor.commit_count)} {pluralize(contributor.commit_count, "commit")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <span className="rounded-full border border-[var(--border-default)] px-2 py-0.5 text-xs font-semibold text-[var(--text-primary)]">#{rank}</span>
          <KebabHorizontalIcon size={18} />
          <GearIcon size={18} />
        </div>
      </div>
      <ContributorMiniBars
        weeks={contributor.weeks}
        chartMax={chartMax}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
    </article>
  );
}

function ContributorMiniBars({
  weeks,
  chartMax,
  periodStart,
  periodEnd,
}: {
  weeks: ContributionWeek[];
  chartMax: number;
  periodStart: string;
  periodEnd: string;
}) {
  const tickValues = [chartMax, Math.round(chartMax / 2), 0];
  const timeline = buildContributionTimeline(weeks, periodStart, periodEnd);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_38px] gap-0">
      <div className="min-w-0">
        <div className="relative h-[102px] border-b border-[#d8dee4]">
          {[0, 50, 100].map((top) => (
            <div
              key={top}
              className={`absolute inset-x-0 border-t ${top === 100 ? "border-[#d8dee4]" : "border-dashed border-[#d8dee4]"}`}
              style={{ top: `${top}%` }}
            />
          ))}
          {timeline.labels.map((label) => (
            <div
              key={label.week_start}
              className="absolute bottom-0 top-0 border-l border-dashed border-[#d8dee4]"
              style={{ left: `${label.left}%` }}
            />
          ))}
          <div className="absolute inset-0">
            {timeline.bars.map((week) => {
              const height = week.commit_count > 0 ? Math.max((week.commit_count / chartMax) * 100, 2) : 0;
              return (
                <div
                  key={week.week_start}
                  className="group absolute bottom-0 flex h-full items-end"
                  style={{ left: `${week.left}%`, width: `${week.width}%` }}
                >
                  {week.showHoverMarker && (
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 hidden w-px -translate-x-1/2 bg-[#0969da]/35 group-hover:block group-focus-within:block"
                      style={{ left: `${week.markerLeft}%` }}
                    />
                  )}
                  <InsightBarTooltip week={week} heightPercent={height} tooltipDate={week.sundayDate} />
                </div>
              );
            })}
          </div>
          <span className="absolute right-[-70px] top-1/2 -translate-y-1/2 rotate-90 origin-center text-xs text-[var(--text-secondary)]">Contributions</span>
        </div>
        <div className="relative mt-3 h-4 text-xs text-[var(--text-secondary)]">
          {timeline.labels.map((week) => (
            <span
              key={week.week_start}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${week.left}%` }}
            >
              {formatShortWeekLabel(week.week_start)}
            </span>
          ))}
        </div>
      </div>
      <div className="relative h-[102px] text-xs text-[var(--text-secondary)]">
        {tickValues.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="absolute left-0 -translate-y-1/2"
            style={{ top: `${index * 50}%` }}
          >
            {formatNumber(value)}
          </span>
        ))}
      </div>
    </div>
  );
}

function getContributorsPeriodFromSearch(search: string): string {
  const normalized = normalizeContributorsSearch(search);
  const params = new URLSearchParams(normalized);
  if (params.get("all") === "1") return "all";
  const from = params.get("from") || "";
  if (from === formatGitHubDate(addMonths(new Date(), -1))) return "1m";
  return "3m";
}

function buildContributorsSearchForPeriod(period: string): string {
  if (period === "all") {
    return "?all=1";
  }
  if (period === "1m") {
    const params = new URLSearchParams();
    params.set("from", formatGitHubDate(addMonths(new Date(), -1)));
    return `?${params.toString()}`;
  }
  return buildContributorsDefaultSearch();
}

function addMonths(value: Date, months: number): Date {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
}

function buildWeeklyRangeLabel(weeks: ContributionWeek[], periodStart: string, periodEnd: string): string {
  const start = weeks[0]?.week_start || periodStart;
  const end = weeks[weeks.length - 1]?.week_start || periodEnd;
  return `Weekly from ${formatLongDate(start)} to ${formatLongDate(end)}`;
}

function formatShortWeekLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date(value));
}

function formatTooltipWeekLabel(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatShortMonthLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(new Date(value));
}

function PulseLoadingLayout() {
  return (
    <div className="space-y-[27px]">
      <div className="overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)]">
        <div className="h-[60px] border-b border-[var(--border-default)] bg-[var(--surface-subtle)] px-[18px] text-base font-semibold leading-[60px] text-[var(--text-primary)]">
          Overview
        </div>
        <SpinnerPlaceholder className="h-[183px]" label="Loading pulse overview" size={34} />
      </div>

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
        <article className="min-h-[231px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-4">
          <h3 className="text-base font-semibold leading-6 text-[var(--text-primary)]">Summary</h3>
          <TextSkeleton className="mt-6 max-w-[466px]" lines={4} lineClassName="h-4" />
        </article>

        <article className="min-h-[231px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-[18px] py-[19px]">
          <PulseTopCommittersHeader />
          <SpinnerPlaceholder className="h-[161px]" label="Loading top committers" size={34} />
        </article>
      </div>
    </div>
  );
}

function PulseActivityDetails({
  pulse,
  defaultBranch,
  chartTicks,
  chartScaleMax,
}: {
  pulse: RepoPulseSnapshot;
  defaultBranch: string;
  chartTicks: Array<{ value: number; top: number }>;
  chartScaleMax: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
      <article className="min-h-[231px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-4">
        <h3 className="text-base font-semibold leading-6 text-[var(--text-primary)]">Summary</h3>
        <div className="mt-6 space-y-3 text-base leading-6 text-[var(--text-secondary)]">
          <p>
            Excluding merges,{" "}
            <strong className="font-semibold text-[var(--text-primary)]">
              {formatNumber(pulse.summary.author_count)} {pluralize(pulse.summary.author_count, "author")}
            </strong>{" "}
            {pulse.summary.author_count === 1 ? "has" : "have"} pushed{" "}
            <strong className="font-semibold text-[var(--text-primary)]">
              {formatNumber(pulse.summary.default_branch_commit_count)} {pluralize(pulse.summary.default_branch_commit_count, "commit")}
            </strong>{" "}
            to {defaultBranch} and{" "}
            <strong className="font-semibold text-[var(--text-primary)]">
              {formatNumber(pulse.summary.all_branch_commit_count)} {pluralize(pulse.summary.all_branch_commit_count, "commit")}
            </strong>{" "}
            to all branches.
          </p>
          <p>
            On {defaultBranch},{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatNumber(pulse.summary.files_changed)} {pluralize(pulse.summary.files_changed, "file")}
            </span>{" "}
            have changed and there have been{" "}
            <span className="underline decoration-[var(--text-primary)] underline-offset-2">
              <span className="font-semibold">
                <span className="text-[#1a7f37]">{formatNumber(pulse.summary.additions)}</span>{" "}
                <span className="text-[var(--text-primary)]">additions</span>
              </span>{" "}
              and{" "}
              <span className="font-semibold">
                <span className="text-[#cf222e]">{formatNumber(pulse.summary.deletions)}</span>{" "}
                <span className="text-[var(--text-primary)]">deletions</span>
              </span>
            </span>
          </p>
        </div>
      </article>

      <article className="min-h-[231px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-[18px] py-[19px]">
        <PulseTopCommittersHeader />

        <div className="grid grid-cols-[45px_minmax(0,1fr)] gap-2">
          <div className="relative h-[138px] text-right text-xs text-[var(--text-secondary)]">
            {chartTicks.map((tick) => (
              <span
                key={tick.top}
                className="absolute right-1 -translate-y-1/2"
                style={{ top: `${tick.top}%` }}
              >
                {formatNumber(tick.value)}
              </span>
            ))}
            <span className="absolute left-[-14px] top-[58px] rotate-[-90deg] text-xs">Commits</span>
          </div>
          <div>
            <div className="relative h-[138px] border-b border-[#d8dee4]">
              {chartTicks.map((tick) => (
                <div
                  key={tick.top}
                  className={`absolute inset-x-0 border-t ${
                    tick.top === 100 ? "border-[#d8dee4]" : "border-dashed border-[#d8dee4]"
                  }`}
                  style={{ top: `${tick.top}%` }}
                />
              ))}
              <div className="absolute bottom-0 left-[10px] flex h-full items-end gap-[14px]">
                {pulse.top_committers.map((item) => {
                  const height = Math.max((item.commit_count / chartScaleMax) * 100, 2);
                  return (
                    <div key={item.author_name} className="flex h-full w-4 items-end">
                      <Tooltip
                        content={`${formatNumber(item.commit_count)} ${pluralize(item.commit_count, "commit")} authored by ${item.author_name}`}
                        placement="top"
                      >
                        <div
                          className="w-4 bg-[#1f883d]"
                          style={{ height: `${height}%` }}
                        />
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="ml-[10px] mt-4 flex gap-[14px]">
              {pulse.top_committers.map((item) => (
                <div
                  key={item.author_name}
                  className="h-4 w-4 overflow-hidden border border-[var(--border-default)] bg-[var(--surface-subtle)] text-center text-[8px] font-semibold leading-4 text-[var(--text-primary)]"
                  title={item.author_name}
                >
                  {(item.author_name || "?").charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function PulseNoCommitActivity({
  repoFullName,
  periodLabel,
}: {
  repoFullName: string;
  periodLabel: string;
}) {
  return (
    <div className="py-[27px] text-center">
      <p className="text-2xl font-semibold leading-8 text-[var(--text-primary)]">
        There hasn't been any commit activity on {repoFullName} over the last {periodLabel}
      </p>
      <p className="mt-2 text-lg text-[var(--text-secondary)]">Want to help out?</p>
      <button
        type="button"
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-[#1f883d] px-4 text-sm font-semibold text-white hover:bg-[#1a7f37]"
      >
        <RepoForkedIcon size={16} />
        Fork this repository
      </button>
    </div>
  );
}

function PulseTopCommittersHeader() {
  return (
    <div className="mb-5 flex items-center justify-between gap-2">
      <h3 className="text-xl font-semibold leading-6 text-[var(--text-primary)]">Top Committers</h3>
      <PulseTopCommittersHeaderActions />
    </div>
  );
}

function PulseTopCommittersHeaderActions() {
  return (
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--surface-subtle)]" aria-label="More options">
          <KebabHorizontalIcon size={18} />
        </button>
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--surface-subtle)]" aria-label="Chart settings">
          <GearIcon size={18} />
        </button>
      </div>
  );
}

function PulseMetric({
  icon,
  iconClassName,
  labelClassName = "text-[var(--text-secondary)]",
  value,
  label,
  isLast = false,
}: {
  icon: ReactNode;
  iconClassName: string;
  labelClassName?: string;
  value: number;
  label: string;
  isLast?: boolean;
}) {
  return (
    <div className={`px-4 py-5 text-center ${isLast ? "" : "border-r border-[var(--border-default)]"}`}>
      <div className="inline-flex items-center gap-1.5 text-xl font-semibold text-[var(--text-primary)]">
        <span className={iconClassName}>{icon}</span>
        <span>{formatNumber(value)}</span>
      </div>
      <p className={`mt-1 text-base ${labelClassName}`}>{label}</p>
    </div>
  );
}
