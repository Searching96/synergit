import { useEffect, useState } from "react";
import { RepoIcon } from "@primer/octicons-react";
import { Loader2 } from "lucide-react";
import { reposApi } from "../../../services/api/repos";
import type { ProfileActivitySnapshot } from "../../../types";
import type { ShowcaseRepo } from "./utils/profileTypes";
import ContributionMatrix from "./ContributionMatrix";

interface ProfileOverviewPageProps {
  pinnedRepositories: ShowcaseRepo[];
  onOpenWorkspace: (repoName: string) => void;
  languageColor: (language: string) => string;
  contributionColor: (level: number) => string;
  isProfileDataLoading: boolean;
  hasProfileDataError: boolean;
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
  isProfileDataLoading,
  hasProfileDataError,
}: ProfileOverviewPageProps) {
  const [requestedYear, setRequestedYear] = useState<number | undefined>(undefined);
  const [reloadNonce, setReloadNonce] = useState(0);
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

  const selectedYear = profileActivity?.selected_year ?? 0;
  const isRollingLast365 = selectedYear === 0;
  const availableYears = profileActivity?.available_years ?? [];

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

  const renderActivityAxisLabel = (label: string, percentage: number) => (
    <>
      {percentage > 0 ? (
        <>
          {percentage}%
          <br />
        </>
      ) : null}
      {label}
    </>
  );

  const otherRepositoriesHref = profileActivity?.username
    ? `/${encodeURIComponent(profileActivity.username)}?tab=repositories`
    : "#";

  // The contribution/activity data is fetched independently from the pinned
  // repositories. Show the spinner only on the first load (no data yet) so that
  // switching years refetches in the background without blanking the layout.
  const showActivitySpinner = isLoading && !profileActivity;
  const showActivityError = !isLoading && loadError !== null && !profileActivity;

  // Phase A: the pinned list / user info is still loading. Render a single,
  // stable placeholder instead of partial content so the page only appears
  // once that fast data is ready (avoids the Pinned section shifting in/out).
  if (isProfileDataLoading) {
    return (
      <div className="min-h-[480px] flex items-center justify-center" role="status" aria-label="Loading profile">
        <Loader2 size={28} className="animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (hasProfileDataError) {
    return (
      <div className="min-h-[480px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)]">Failed to fetch</p>
      </div>
    );
  }

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

      {showActivitySpinner ? (
        <div
          className="min-h-[480px] flex items-center justify-center"
          role="status"
          aria-label="Loading contribution activity"
        >
          <Loader2 size={28} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      ) : showActivityError ? (
        <div className="min-h-[480px] flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-[var(--text-secondary)]">{loadError}</p>
          <button
            type="button"
            onClick={() => setReloadNonce((value) => value + 1)}
            className="rounded-md border border-[var(--border-default)] px-3 py-1 text-xs text-[var(--text-link)] hover:bg-[var(--surface-hover)]"
          >
            Retry
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_100px] gap-6 items-start">
        <div className="space-y-6">
          <section className="border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] overflow-hidden">
            <div className="p-4">
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

              <ContributionMatrix
                contributionDays={profileActivity?.contribution_days ?? []}
                selectedYear={selectedYear}
                isRollingLast365={isRollingLast365}
                totalContributions={profileActivity?.total_contributions}
                contributionColor={contributionColor}
              />
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
                          <a
                            href={`/${repo.repository
                              .split("/")
                              .map((segment) => encodeURIComponent(segment))
                              .join("/")}`}
                            className="text-[var(--text-link)] hover:underline"
                          >
                            {repo.repository}
                          </a>
                          {index < topRepositories.length - 1 ? ", " : ""}
                        </span>
                      ))}
                      {" "}and {otherRepoCount} other{" "}
                      <a href={otherRepositoriesHref} className="text-[var(--text-link)] hover:underline">
                        {otherRepoCount === 1 ? "repository" : "repositories"}
                      </a>{" "}
                      in the last 365 days.
                    </p>
                  ) : (
                    <p className="text-[var(--text-primary)]">No repository contributions in the last 365 days.</p>
                  )}
                </div>

                <div className="flex items-center justify-center">
                  <div className="relative w-full max-w-[320px] h-[190px] text-[var(--text-secondary)]">
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 text-center text-sm">
                      {renderActivityAxisLabel("Code review", activitySplit.codeReview)}
                    </span>
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-center text-sm">
                      {renderActivityAxisLabel("Commits", activitySplit.commits)}
                    </span>
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-center text-sm">
                      {renderActivityAxisLabel("Issues", activitySplit.issues)}
                    </span>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-sm">
                      {renderActivityAxisLabel("Pull requests", activitySplit.pullRequests)}
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
                    onClick={() => setRequestedYear((current) => (current === year ? undefined : year))}
                    className={`w-full h-10 px-3 text-left ${active ? "bg-[var(--text-link)] text-[var(--text-on-accent)] font-medium" : "hover:bg-[var(--surface-subtle)]"}`}
                  >
                    {year}
                  </button>
                );
              })
          )}
        </div>
      </div>
      )}
    </div>
  );
}

