CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    path VARCHAR(1024) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL DEFAULT '',
    visibility VARCHAR(16) NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public', 'private')),
    primary_language VARCHAR(64) NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_repositories_created_at
    ON repositories (created_at);

CREATE INDEX IF NOT EXISTS idx_repositories_name
    ON repositories (name);

CREATE INDEX IF NOT EXISTS idx_repositories_primary_language
    ON repositories (primary_language);

CREATE TABLE IF NOT EXISTS repository_collaborators (
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('OWNER', 'MAINTAINER', 'WRITE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repository_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_repository_collaborators_user
    ON repository_collaborators (user_id);

CREATE TABLE IF NOT EXISTS pull_requests (
    id UUID PRIMARY KEY,
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    source_branch VARCHAR(255) NOT NULL,
    target_branch VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'MERGED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_created_at
    ON pull_requests (repo_id, created_at DESC);

CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY,
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_repo_created_at
    ON issues (repo_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_issues_repo_status
    ON issues (repo_id, status);

CREATE TABLE IF NOT EXISTS issue_assignees (
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (issue_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_assignees_issue_assigned_at
    ON issue_assignees (issue_id, assigned_at);

CREATE TABLE IF NOT EXISTS repo_insights (
    repo_id UUID PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
    computed_at TIMESTAMPTZ NOT NULL,
    commits_last_30d INTEGER NOT NULL DEFAULT 0,
    commit_trend JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_contributors JSONB NOT NULL DEFAULT '[]'::jsonb,
    branch_activity JSONB NOT NULL DEFAULT '[]'::jsonb,
    primary_language VARCHAR(64) NOT NULL DEFAULT '',
    language_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_repo_insights_computed_at
    ON repo_insights (computed_at DESC);