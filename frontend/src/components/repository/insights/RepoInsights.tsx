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
import type { RepoPulseSnapshot } from "../../../types";
import { reposApi } from "../../../services/api";
import { Tooltip } from "../../shared/Tooltip";
import { SpinnerPlaceholder, TextSkeleton } from "../../shared/LoadingPlaceholders";

interface RepoInsightsProps {
  repoId: string;
  repoOwner?: string;
  repoName?: string;
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

export default function RepoInsights({ repoId, repoOwner, repoName }: RepoInsightsProps) {
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
      <aside className="h-fit overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)]">
        {INSIGHTS_NAV_ITEMS.map((item, index) => (
          <button
            key={item}
            type="button"
            className={`block h-[43px] w-full border-b border-[var(--border-default)] px-[17px] text-left text-base leading-[43px] last:border-b-0 ${
              index === 0
                ? "border-l-2 border-l-[#fd8c73] bg-[var(--surface-canvas)] pl-[16px] font-normal text-[var(--text-primary)]"
                : "text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            {item}
          </button>
        ))}
      </aside>

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
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--surface-subtle)]" aria-label="More options">
          <KebabHorizontalIcon size={18} />
        </button>
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--surface-subtle)]" aria-label="Chart settings">
          <GearIcon size={18} />
        </button>
      </div>
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
