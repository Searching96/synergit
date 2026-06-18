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
  CommentDiscussionIcon,
} from "@primer/octicons-react";
import type { ContributionDay, ContributionWeek, ContributorContribution, RepoCommitActivitySnapshot, RepoContributorsSnapshot, RepoPulseSnapshot } from "../../../types";
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
  onOpenCommunity: () => void;
  onOpenCommunityStandards: () => void;
  onOpenCommitActivity: () => void;
}

const INSIGHTS_NAV_ITEMS = [
  "Pulse",
  "Contributors",
  "Community",
  "Community standards",
  "Traffic",
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

  if (props.contentKind === "community") {
    return <RepoCommunityInsights {...props} />;
  }

  if (props.contentKind === "community-standards") {
    return <RepoCommunityStandardsInsights {...props} />;
  }

  if (props.contentKind === "commit-activity") {
    return <RepoCommitActivityInsights {...props} />;
  }

  return <RepoPulseInsights {...props} />;
}

function RepoPulseInsights({
  repoId,
  repoOwner,
  repoName,
  onOpenPulse,
  onOpenContributors,
  onOpenCommunity,
  onOpenCommunityStandards,
  onOpenCommitActivity,
}: RepoInsightsProps) {
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
      <InsightsSidebar
        activeItem="Pulse"
        onOpenPulse={onOpenPulse}
        onOpenContributors={onOpenContributors}
        onOpenCommunity={onOpenCommunity}
        onOpenCommunityStandards={onOpenCommunityStandards}
        onOpenCommitActivity={onOpenCommitActivity}
      />

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
  onOpenCommunity,
  onOpenCommunityStandards,
  onOpenCommitActivity,
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
      <InsightsSidebar
        activeItem="Contributors"
        onOpenPulse={onOpenPulse}
        onOpenContributors={onOpenContributors}
        onOpenCommunity={onOpenCommunity}
        onOpenCommunityStandards={onOpenCommunityStandards}
        onOpenCommitActivity={onOpenCommitActivity}
      />

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

function RepoCommunityInsights({
  onOpenPulse,
  onOpenContributors,
  onOpenCommunity,
  onOpenCommunityStandards,
  onOpenCommitActivity,
}: RepoInsightsProps) {
  return (
    <div className="mx-auto mt-7 grid w-full max-w-[1216px] grid-cols-1 gap-[62px] lg:grid-cols-[296px_minmax(0,1fr)]">
      <InsightsSidebar
        activeItem="Community"
        onOpenPulse={onOpenPulse}
        onOpenContributors={onOpenContributors}
        onOpenCommunity={onOpenCommunity}
        onOpenCommunityStandards={onOpenCommunityStandards}
        onOpenCommitActivity={onOpenCommitActivity}
      />

      <section className="flex min-h-[420px] min-w-0 items-start justify-center pt-[29px]">
        <div className="w-full max-w-[760px] text-center">
          <CommentDiscussionIcon size={28} className="mx-auto mb-4 text-[var(--text-secondary)]" />
          <h2 className="text-[20px] font-semibold leading-6 text-[var(--text-primary)]">
            Enable Discussions to unlock Community Insights!
          </h2>
          <p className="mt-3 text-base leading-6 text-[var(--text-secondary)]">
            Discussions is the central space for your community to share announcements, ask questions, and host conversations.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex h-8 items-center justify-center rounded-md bg-[#1f883d] px-4 text-sm font-semibold text-white hover:bg-[#1a7f37]"
          >
            Set up discussions
          </button>
        </div>
      </section>
    </div>
  );
}

const COMMUNITY_STANDARD_ITEMS = [
  {
    title: "Description",
    description: "Add a description to your repository so people understand the goals of your project.",
    helpText: "",
    showAdd: true,
  },
  {
    title: "README",
    helpText: "Writing a README",
    showAdd: true,
  },
  {
    title: "Code of conduct",
    helpText: "What is a code of conduct?",
    showAdd: true,
  },
  {
    title: "Contributing",
    helpText: "Writing contributing guidelines",
    showAdd: true,
  },
  {
    title: "License",
    helpText: "Choosing a license",
    showAdd: true,
  },
  {
    title: "Security policy",
    helpText: "Set up a security policy",
    showAdd: true,
  },
  {
    title: "Issue templates",
    helpText: "",
    showAdd: true,
  },
  {
    title: "Pull request template",
    helpText: "",
    showAdd: false,
  },
];

function RepoCommunityStandardsInsights({
  onOpenPulse,
  onOpenContributors,
  onOpenCommunity,
  onOpenCommunityStandards,
  onOpenCommitActivity,
}: RepoInsightsProps) {
  return (
    <div className="mx-auto mt-[13px] grid w-full max-w-[1368px] grid-cols-1 gap-[27px] lg:grid-cols-[333px_minmax(0,1fr)]">
      <InsightsSidebar
        activeItem="Community standards"
        onOpenPulse={onOpenPulse}
        onOpenContributors={onOpenContributors}
        onOpenCommunity={onOpenCommunity}
        onOpenCommunityStandards={onOpenCommunityStandards}
        onOpenCommitActivity={onOpenCommitActivity}
      />

      <section className="min-w-0">
        <div className="border-b border-[var(--border-default)] pb-[11px]">
          <h2 className="text-[26px] font-normal leading-9 text-[var(--text-primary)]">Community Standards</h2>
        </div>

        <p className="mt-[39px] text-center text-[22px] font-normal leading-7 text-[var(--text-primary)]">
          Here's how this project compares to{" "}
          <a href="#" className="text-[var(--text-link)] underline">
            recommended community standards
          </a>
          .
        </p>

        <h3 className="mt-[42px] text-lg font-semibold leading-6 text-[var(--text-primary)]">Checklist</h3>

        <div className="mt-[10px] overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)]">
          {COMMUNITY_STANDARD_ITEMS.map((item, index) => {
            const isDescription = item.title === "Description";
            return (
              <div
                key={item.title}
                className={`grid grid-cols-[18px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-[var(--border-default)] px-[18px] last:border-b-0 ${
                  isDescription ? "min-h-[102px] pb-[16px] pt-[18px]" : "min-h-[67px]"
                }`}
              >
                <span className="mt-[2px] h-[9px] w-[9px] rounded-full bg-[#9a6700]" />
                <div className={isDescription ? "self-start pt-[21px]" : ""}>
                  <div className="text-base font-normal leading-5 text-[var(--text-primary)]">{item.title}</div>
                  {item.description && (
                    <p className="mt-[8px] text-sm leading-5 text-[var(--text-secondary)]">{item.description}</p>
                  )}
                </div>
                <div className="justify-self-end text-sm leading-5">
                  {item.helpText && (
                    <a href="#" className="whitespace-nowrap text-[var(--text-link)] hover:underline">
                      {item.helpText}
                    </a>
                  )}
                </div>
                <div className="w-[54px] justify-self-end">
                  {item.showAdd && (
                    <button
                      type="button"
                      className="inline-flex h-8 w-[54px] items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                    >
                      Add
                    </button>
                  )}
                </div>
                {index === COMMUNITY_STANDARD_ITEMS.length - 1 && <span className="sr-only">End of checklist</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-[28px] text-right text-sm text-[var(--text-primary)]">
          What is{" "}
          <a href="#" className="text-[var(--text-link)] underline">
            the community profile?
          </a>
        </div>
      </section>
    </div>
  );
}

function RepoCommitActivityInsights({
  repoId,
  repoOwner,
  repoName,
  onOpenPulse,
  onOpenContributors,
  onOpenCommunity,
  onOpenCommunityStandards,
  onOpenCommitActivity,
}: RepoInsightsProps) {
  const [snapshot, setSnapshot] = useState<RepoCommitActivitySnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCommitActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextSnapshot = await reposApi.getCommitActivity(repoId);
      setSnapshot(nextSnapshot);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load commit activity");
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    void loadCommitActivity();
  }, [loadCommitActivity]);

  const repoFullName = repoOwner && repoName ? `${repoOwner}/${repoName}` : repoName || "this repository";

  return (
    <div className="mx-auto mt-7 grid w-full max-w-[1368px] grid-cols-1 gap-[27px] lg:grid-cols-[333px_minmax(0,1fr)]">
      <InsightsSidebar
        activeItem="Commits"
        onOpenPulse={onOpenPulse}
        onOpenContributors={onOpenContributors}
        onOpenCommunity={onOpenCommunity}
        onOpenCommunityStandards={onOpenCommunityStandards}
        onOpenCommitActivity={onOpenCommitActivity}
      />

      <section className="min-w-0">
        <h2 className="mb-[29px] text-[28px] font-normal leading-9 text-[var(--text-primary)]">
          Commits over the last year of <span className="font-semibold">{repoFullName}</span>
        </h2>

        {loading ? (
          <article className="min-h-[592px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-[18px] py-[19px]">
            <CommitActivityCardHeader />
            <SpinnerPlaceholder className="h-[500px]" label="Loading commit activity" size={34} />
          </article>
        ) : error ? (
          <div className="rounded-md border border-[var(--border-danger-soft)] bg-[var(--surface-danger-subtle)] p-6 text-sm text-[var(--text-danger)]">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              onClick={() => void loadCommitActivity()}
              className="mt-3 h-8 rounded-md border border-[var(--border-danger-muted)] bg-[var(--surface-canvas)] px-3 font-semibold hover:bg-[var(--surface-danger-subtle)]"
            >
              Retry
            </button>
          </div>
        ) : snapshot ? (
          <CommitActivityChartCard snapshot={snapshot} />
        ) : (
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-8 text-center text-sm text-[var(--text-secondary)]">
            No commit activity available.
          </div>
        )}
      </section>
    </div>
  );
}

function CommitActivityCardHeader() {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-xl font-semibold leading-6 text-[var(--text-primary)]">Commits</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Number of commits per week</p>
      </div>
      <PulseTopCommittersHeaderActions />
    </div>
  );
}

function CommitActivityChartCard({ snapshot }: { snapshot: RepoCommitActivitySnapshot }) {
  const maxCount = Math.max(...snapshot.weekly_totals.map((week) => week.commit_count), 1);
  const chartMax = maxCount <= 40 ? 40 : Math.ceil(maxCount / 10) * 10;
  const ticks = buildCommitActivityTicks(chartMax);
  const chart = buildCommitActivityChart(snapshot.weekly_totals, snapshot.period_start, snapshot.period_end);

  return (
    <article className="min-h-[592px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-[18px] py-[19px]">
      <CommitActivityCardHeader />

      <div className="mt-[22px] grid grid-cols-[42px_minmax(0,1fr)] gap-5 pr-1">
        <div className="relative h-[444px] text-right text-sm text-[var(--text-secondary)]">
          <span className="absolute left-[-24px] top-1/2 -translate-y-1/2 rotate-[-90deg] text-sm">Commits</span>
          {ticks.map((tick) => (
            <span key={tick.value} className="absolute right-0 -translate-y-1/2" style={{ top: `${tick.top}%` }}>
              {tick.value}
            </span>
          ))}
        </div>

        <div className="relative h-[484px]">
          <div className="relative h-[444px] border-b border-[#d8dee4]">
            {ticks.map((tick) => (
              <div
                key={tick.value}
                className={`absolute inset-x-0 border-t ${tick.value === 0 ? "border-[#d8dee4]" : "border-dashed border-[#d8dee4]"}`}
                style={{ top: `${tick.top}%` }}
              />
            ))}
            {chart.bars.map((bar) => {
              const height = bar.commit_count > 0 ? Math.max((bar.commit_count / chartMax) * 100, 1.5) : 0;
              return (
                <div
                  key={bar.week_start}
                  className="group absolute bottom-0 flex h-full items-end"
                  style={{
                    left: `${bar.left}%`,
                    width: `${bar.width}%`,
                  }}
                >
                  <CommitActivityBarTooltip week={bar} heightPercent={height} />
                </div>
              );
            })}
          </div>

          <div className="relative mt-[15px] h-5 text-sm text-[var(--text-secondary)]">
            {chart.monthLabels.map((label) => (
              <span key={`${label.text}-${label.left}`} className="absolute -translate-x-1/2" style={{ left: `${label.left}%` }}>
                {label.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function CommitActivityBarTooltip({
  week,
  heightPercent,
}: {
  week: ContributionWeek;
  heightPercent: number;
}) {
  const hasCommits = week.commit_count > 0;
  const mondayDate = dayStartLocal(new Date(week.week_start));
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(sundayDate.getDate() - 1);

  return (
    <div
      className="group relative w-full bg-[#2da44e]"
      style={{ height: `${heightPercent}%` }}
      tabIndex={hasCommits ? 0 : undefined}
    >
      <div className="h-full w-full" />
      {hasCommits && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-xs font-normal text-[var(--text-primary)] shadow-md group-hover:block group-focus:block">
          <div className="min-w-[124px]">
            <p className="mb-2 whitespace-nowrap">Week of {formatTooltipWeekLabel(sundayDate.toISOString())}</p>
            <div className="flex items-center justify-between gap-5">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 bg-[#2da44e]" />
                <span>Commits</span>
              </span>
              <span>{formatNumber(week.commit_count)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildCommitActivityTicks(chartMax: number) {
  const step = Math.max(Math.round(chartMax / 8), 1);
  const ticks: Array<{ value: number; top: number }> = [];
  for (let value = chartMax; value >= 0; value -= step) {
    ticks.push({
      value,
      top: ((chartMax - value) / chartMax) * 100,
    });
  }
  if (ticks[ticks.length - 1]?.value !== 0) {
    ticks.push({ value: 0, top: 100 });
  }
  return ticks;
}

function buildCommitActivityChart(weeks: ContributionWeek[], periodStart: string, periodEnd: string) {
  const start = dayStartLocal(new Date(periodStart));
  const end = dayStartLocal(new Date(periodEnd));
  const totalDays = Math.max(daysBetween(start, end), 1);
  const barWidth = Math.max((7 / totalDays) * 100 * 0.78, 0.7);

  const bars = weeks.map((week) => {
    const weekDate = dayStartLocal(new Date(week.week_start));
    const centerLeft = clampPercent((daysBetween(start, weekDate) / totalDays) * 100);
    const left = Math.min(Math.max(centerLeft - barWidth / 2, 0), 100 - barWidth);
    return {
      ...week,
      left,
      width: barWidth,
    };
  });

  const monthLabels: Array<{ text: string; left: number }> = [];
  const current = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  for (; current <= end; current.setMonth(current.getMonth() + 1)) {
    monthLabels.push({
      text: new Intl.DateTimeFormat("en-US", { month: "short" }).format(current),
      left: clampPercent((daysBetween(start, current) / totalDays) * 100),
    });
  }

  return { bars, monthLabels };
}

function dayStartLocal(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function InsightsSidebar({
  activeItem,
  onOpenPulse,
  onOpenContributors,
  onOpenCommunity,
  onOpenCommunityStandards,
  onOpenCommitActivity,
}: {
  activeItem: string;
  onOpenPulse: () => void;
  onOpenContributors: () => void;
  onOpenCommunity: () => void;
  onOpenCommunityStandards: () => void;
  onOpenCommitActivity: () => void;
}) {
  return (
    <aside className="h-fit overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)]">
      {INSIGHTS_NAV_ITEMS.map((item) => {
        const isActive = item === activeItem;
        const onClick = item === "Pulse"
          ? onOpenPulse
          : item === "Contributors"
            ? onOpenContributors
            : item === "Community"
              ? onOpenCommunity
              : item === "Community standards"
                ? onOpenCommunityStandards
                : item === "Commits"
                  ? onOpenCommitActivity
                  : undefined;
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
      <ContributionMiniTimeline
        dailyTotals={snapshot.daily_totals}
        periodStart={snapshot.period_start}
        periodEnd={snapshot.period_end}
      />
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
  const domain = buildContributionChartDomain(periodStart, periodEnd);
  const { chartStart, chartEnd, firstLabel, lastLabel, labelStepDays, totalDays } = domain;
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
  for (const current = firstLabel; current <= lastLabel; current.setDate(current.getDate() + labelStepDays)) {
    labels.push({
      week_start: current.toISOString(),
      left: clampPercent((daysBetween(chartStart, current) / totalDays) * 100),
    });
  }

  return { bars, labels };
}

function buildContributionChartDomain(periodStart: string, periodEnd: string) {
  const start = startOfDay(new Date(periodStart));
  const end = startOfDay(new Date(periodEnd));
  const periodDays = daysBetween(start, end);
  const labelStepDays = periodDays >= 84 ? 14 : 7;
  const firstLabel = firstMondayOnOrAfter(start);
  const labelLimit = new Date(end);
  labelLimit.setDate(labelLimit.getDate() + 1);
  const lastLabel = lastMondayOnOrBefore(labelLimit);
  const chartStart = new Date(firstLabel);
  chartStart.setDate(chartStart.getDate() - 7);
  const chartEnd = new Date(lastLabel);
  chartEnd.setDate(chartEnd.getDate() + 3);
  const totalDays = Math.max(daysBetween(chartStart, chartEnd), 1);

  return { chartStart, chartEnd, firstLabel, lastLabel, labelStepDays, totalDays };
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

function ContributionMiniTimeline({
  dailyTotals,
  periodStart,
  periodEnd,
}: {
  dailyTotals: ContributionDay[];
  periodStart: string;
  periodEnd: string;
}) {
  const trend = buildContributionTrendNavigator(dailyTotals, periodStart, periodEnd);

  return (
    <div className="mt-[54px] grid h-[56px] grid-cols-[minmax(0,1fr)_42px] gap-1">
      <div>
        <div className="relative h-[41px] border border-[#8c959f] bg-[#ddf4ff]">
          <div className="pointer-events-none absolute inset-y-0 bg-[rgba(125,140,255,0.28)]" style={{ left: `${trend.selectionLeft}%`, width: `${trend.selectionWidth}%` }} />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
            <path d={trend.areaPath} fill="#c8e1ff" opacity="0.72" />
            <path d={trend.linePath} fill="none" stroke="#0969da" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.75" />
          </svg>
          <div className="pointer-events-none absolute inset-x-0 bottom-[5px] flex h-3 text-[10px] text-[var(--text-secondary)]">
            {trend.monthLabels.map((label) => (
              <span
                key={`${label.text}-${label.left}`}
                className="absolute -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${label.left}%` }}
              >
                {label.text}
              </span>
            ))}
          </div>
          <div className="absolute left-[-5px] top-1/2 h-[16px] w-[8px] -translate-y-1/2 border border-[#8c959f] bg-[var(--surface-canvas)]">
            <span className="absolute left-[2px] top-[3px] h-[8px] border-l border-[#8c959f]" />
            <span className="absolute left-[4px] top-[3px] h-[8px] border-l border-[#8c959f]" />
          </div>
          <div className="absolute right-[-5px] top-1/2 h-[16px] w-[8px] -translate-y-1/2 border border-[#8c959f] bg-[var(--surface-canvas)]">
            <span className="absolute left-[2px] top-[3px] h-[8px] border-l border-[#8c959f]" />
            <span className="absolute left-[4px] top-[3px] h-[8px] border-l border-[#8c959f]" />
          </div>
        </div>
        <div className="h-[8px] rounded-b-sm bg-[#c8c8c8]" />
      </div>
      <div aria-hidden="true" />
    </div>
  );
}

function buildContributionTrendNavigator(
  dailyTotals: ContributionDay[],
  periodStart: string,
  periodEnd: string,
) {
  const trendStart = dailyTotals[0]?.date || periodStart;
  const trendEnd = dailyTotals[dailyTotals.length - 1]?.date || periodEnd;
  const { chartStart, chartEnd, totalDays } = buildContributionChartDomain(trendStart, trendEnd);
  const countByDay = new Map(dailyTotals.map((day) => [day.date, day.commit_count]));
  const points: Array<{ x: number; y: number }> = [];
  const counts: number[] = [];
  for (const current = new Date(chartStart); current <= chartEnd; current.setDate(current.getDate() + 1)) {
    const count = countByDay.get(formatISODate(current)) || 0;
    counts.push(count);
    points.push({
      x: clampPercent((daysBetween(chartStart, current) / totalDays) * 100),
      y: 30,
    });
  }

  const smoothedCounts = smoothTrendCounts(counts);
  const maxCount = Math.max(...smoothedCounts, 1);
  points.forEach((point, index) => {
    point.y = 30 - (smoothedCounts[index] / maxCount) * 20;
  });

  const trendPoints = buildTrendSplinePoints(points);
  const linePath = buildSmoothTrendPath(trendPoints);
  const firstPoint = trendPoints[0] || { x: 0, y: 30 };
  const lastPoint = trendPoints[trendPoints.length - 1] || { x: 100, y: 30 };
  const areaPath = `M ${firstPoint.x.toFixed(2)} 30 L ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)} ${linePath.replace(/^M\s+[\d.-]+\s+[\d.-]+/, "")} L ${lastPoint.x.toFixed(2)} 30 Z`;
  const monthLabels = buildTrendMonthLabels(chartStart, chartEnd, totalDays);

  return {
    areaPath,
    linePath,
    monthLabels,
    selectionLeft: 0,
    selectionWidth: 100,
  };
}

function smoothTrendCounts(counts: number[]): number[] {
  const radius = counts.length >= 120 ? 30 : counts.length >= 60 ? 20 : 10;
  const sigma = Math.max(radius / 2.8, 1);
  let smoothed = counts;
  for (let pass = 0; pass < 2; pass += 1) {
    smoothed = smoothed.map((_, index) => {
      let total = 0;
      let weightTotal = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const value = smoothed[index + offset];
        if (value === undefined) continue;
        const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
        total += value * weight;
        weightTotal += weight;
      }
      return weightTotal > 0 ? total / weightTotal : 0;
    });
  }
  return smoothed;
}

function buildTrendSplinePoints(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points;

  const step = points.length >= 120 ? 4 : points.length >= 60 ? 3 : 2;
  const sampled: Array<{ x: number; y: number }> = [];
  points.forEach((point, index) => {
    if (index === 0 || index === points.length - 1 || index % step === 0) {
      sampled.push(point);
    }
  });
  return sampled;
}

function buildSmoothTrendPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "M 0 30 L 100 30";
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  const commands = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(index - 1, 0)];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[Math.min(index + 2, points.length - 1)];
    const controlOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const controlTwo = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6,
    };
    commands.push(
      `C ${controlOne.x.toFixed(2)} ${controlOne.y.toFixed(2)}, ${controlTwo.x.toFixed(2)} ${controlTwo.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`,
    );
  }
  return commands.join(" ");
}

function buildTrendMonthLabels(chartStart: Date, chartEnd: Date, totalDays: number) {
  const labels: Array<{ text: string; left: number }> = [];
  const current = new Date(chartStart.getFullYear(), chartStart.getMonth() + 1, 1);
  for (; current < chartEnd; current.setMonth(current.getMonth() + 1)) {
    labels.push({
      text: formatShortMonthLabel(current.toISOString()),
      left: clampPercent((daysBetween(chartStart, current) / totalDays) * 100),
    });
  }
  return labels;
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
  contributor: ContributorContribution;
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
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-[var(--text-secondary)]">
              <span>
                {formatNumber(contributor.commit_count)} {pluralize(contributor.commit_count, "commit")}
              </span>
              <span className="text-[#1a7f37]">{formatNumber(contributor.additions)} ++</span>
              <span className="text-[#cf222e]">{formatNumber(contributor.deletions)} --</span>
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
  const date = new Date(value);
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  return `${month} '${date.getFullYear().toString().slice(-2)}`;
}

function formatISODate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
