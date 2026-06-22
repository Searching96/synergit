CREATE SCHEMA IF NOT EXISTS insight;

CREATE TABLE IF NOT EXISTS insight.repo_insights (
    repo_id UUID PRIMARY KEY,
    computed_at TIMESTAMPTZ NOT NULL,
    commits_last_30d INTEGER NOT NULL DEFAULT 0,
    commit_trend JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_contributors JSONB NOT NULL DEFAULT '[]'::jsonb,
    branch_activity JSONB NOT NULL DEFAULT '[]'::jsonb,
    primary_language VARCHAR(64) NOT NULL DEFAULT '',
    language_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_insight_repo_insights_computed_at
    ON insight.repo_insights (computed_at DESC);

CREATE TABLE IF NOT EXISTS insight.repo_pulse_snapshots (
    repo_id UUID NOT NULL,
    period VARCHAR(16) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    default_branch VARCHAR(255) NOT NULL DEFAULT '',
    overview JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    top_committers JSONB NOT NULL DEFAULT '[]'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, period, period_end)
);

CREATE INDEX IF NOT EXISTS idx_insight_repo_pulse_snapshots_repo_computed_at
    ON insight.repo_pulse_snapshots (repo_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS insight.repo_contributors_snapshots (
    repo_id UUID NOT NULL,
    period VARCHAR(16) NOT NULL,
    period_label VARCHAR(32) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    default_branch VARCHAR(255) NOT NULL DEFAULT '',
    weekly_totals JSONB NOT NULL DEFAULT '[]'::jsonb,
    daily_totals JSONB NOT NULL DEFAULT '[]'::jsonb,
    all_time_daily_totals JSONB NOT NULL DEFAULT '[]'::jsonb,
    contributors JSONB NOT NULL DEFAULT '[]'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, period, period_end)
);

CREATE INDEX IF NOT EXISTS idx_insight_repo_contributors_snapshots_repo_computed_at
    ON insight.repo_contributors_snapshots (repo_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS insight.repo_commit_activity_snapshots (
    repo_id UUID NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    weekly_totals JSONB NOT NULL DEFAULT '[]'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, period_end)
);

CREATE INDEX IF NOT EXISTS idx_insight_repo_commit_activity_snapshots_repo_computed_at
    ON insight.repo_commit_activity_snapshots (repo_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS insight.repo_code_frequency_snapshots (
    repo_id UUID NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    weekly_totals JSONB NOT NULL DEFAULT '[]'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, period_end)
);

CREATE INDEX IF NOT EXISTS idx_insight_repo_code_frequency_snapshots_repo_computed_at
    ON insight.repo_code_frequency_snapshots (repo_id, computed_at DESC);
