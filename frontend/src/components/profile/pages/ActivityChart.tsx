interface ActivityChartProps {
  commits: number;
  codeReviews: number;
  issues: number;
  pullRequests: number;
}

function toPercentage(value: number, total: number): number {
  if (value <= 0 || total <= 0) return 0;
  return Math.max(1, Math.round((value / total) * 100));
}

export default function ActivityChart({ commits, codeReviews, issues, pullRequests }: ActivityChartProps) {
  const total = commits + codeReviews + issues + pullRequests;
  const split = {
    commits: toPercentage(commits, total),
    codeReview: toPercentage(codeReviews, total),
    issues: toPercentage(issues, total),
    pullRequests: toPercentage(pullRequests, total),
  };

  const center = 90;
  const radius = 68;

  const points = {
    codeReview: { pct: split.codeReview, x: center, y: center - (radius * split.codeReview) / 100 },
    issues: { pct: split.issues, x: center + (radius * split.issues) / 100, y: center },
    pullRequests: { pct: split.pullRequests, x: center, y: center + (radius * split.pullRequests) / 100 },
    commits: { pct: split.commits, x: center - (radius * split.commits) / 100, y: center },
  };

  const axes: Array<{ key: string; label: string; pct: number; x: number; y: number }> = [
    { key: "codeReview", label: "Code review", ...points.codeReview },
    { key: "issues", label: "Issues", ...points.issues },
    { key: "pullRequests", label: "Pull requests", ...points.pullRequests },
    { key: "commits", label: "Commits", ...points.commits },
  ];

  return (
    <div className="relative w-full max-w-[280px] h-[240px] text-[var(--text-secondary)] mx-auto">
      <span className="absolute top-0 left-1/2 -translate-x-1/2 text-center text-xs leading-tight">
        {split.codeReview > 0 ? <>{split.codeReview}%<br /></> : null}
        Code review
      </span>
      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-center text-xs leading-tight">
        {split.commits > 0 ? <>{split.commits}%<br /></> : null}
        Commits
      </span>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-center text-xs leading-tight">
        {split.issues > 0 ? <>{split.issues}%<br /></> : null}
        Issues
      </span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-xs leading-tight">
        {split.pullRequests > 0 ? <>{split.pullRequests}%<br /></> : null}
        Pull requests
      </span>

      <svg viewBox="0 0 180 180" className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2" role="img" aria-label="Activity distribution graph">
        {/* Data polygon (behind axes) */}
        <polygon
          points={axes.map((a) => a.pct > 0 ? `${a.x},${a.y}` : `${center},${center}`).join(" ")}
          fill="var(--contrib-level-1)"
          stroke="none"
        />

        {/* Background cross axes */}
        <line x1={center} y1={4} x2={center} y2={176} stroke="var(--accent-line)" strokeWidth="1.5" />
        <line x1={4} y1={center} x2={176} y2={center} stroke="var(--accent-line)" strokeWidth="1.5" />

        {/* Endpoint circles (on top) */}
        {axes.filter((a) => a.pct > 0).map((a) => (
          <circle
            key={`pt-${a.key}`}
            cx={a.x}
            cy={a.y}
            r="2.5"
            fill="var(--surface-canvas)"
            stroke="var(--accent-line)"
            strokeWidth="2"
          />
        ))}

      </svg>
    </div>
  );
}
