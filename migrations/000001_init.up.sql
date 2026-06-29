CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
    website VARCHAR(255) NOT NULL DEFAULT '',
    topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    visibility VARCHAR(16) NOT NULL DEFAULT 'PUBLIC'
        CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    primary_language VARCHAR(64) NOT NULL DEFAULT '',
    parent_id UUID REFERENCES repositories(id) ON DELETE SET NULL
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
    source_commit_hash VARCHAR(64) NOT NULL DEFAULT '',
    target_commit_hash VARCHAR(64) NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'MERGED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_created_at
    ON pull_requests (repo_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pull_request_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pull_request_events_pull_request
    ON pull_request_events (pull_request_id, created_at);

CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY,
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'CLOSED')),
    close_reason VARCHAR(24)
        CHECK (close_reason IN ('COMPLETED', 'NOT_PLANNED', 'DUPLICATE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_repo_created_at
    ON issues (repo_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_issues_repo_status
    ON issues (repo_id, status);

CREATE TABLE IF NOT EXISTS issue_linked_branches (
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (issue_id, branch_name)
);

CREATE TABLE IF NOT EXISTS pull_request_linked_issues (
    pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (pull_request_id, issue_id)
);

CREATE TABLE IF NOT EXISTS issue_relationships (
    blocking_issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    blocked_issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocking_issue_id, blocked_issue_id),
    CHECK (blocking_issue_id <> blocked_issue_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_relationships_blocked
    ON issue_relationships (blocked_issue_id, linked_at);

CREATE INDEX IF NOT EXISTS idx_issue_relationships_blocking
    ON issue_relationships (blocking_issue_id, linked_at);

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

CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#cccccc',
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (repo_id, name)
);

CREATE INDEX IF NOT EXISTS idx_labels_repo ON labels (repo_id);

CREATE TABLE IF NOT EXISTS issue_labels (
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_labels_issue ON issue_labels (issue_id);

CREATE TABLE IF NOT EXISTS issue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_events_issue ON issue_events (issue_id, created_at);


CREATE TABLE IF NOT EXISTS issue_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON issue_comments (issue_id, created_at);

CREATE TABLE IF NOT EXISTS repo_stars (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, repo_id)
);

CREATE INDEX IF NOT EXISTS idx_repo_stars_repo ON repo_stars (repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_stars_user ON repo_stars (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS repo_watchers (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_repo_watchers_repo ON repo_watchers (repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_watchers_user ON repo_watchers (user_id, created_at DESC);


CREATE TABLE IF NOT EXISTS pull_request_labels (
    pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (pull_request_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_pr_labels_pr ON pull_request_labels (pull_request_id);

CREATE TABLE IF NOT EXISTS pull_request_assignees (
    pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (pull_request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pr_assignees_pr ON pull_request_assignees (pull_request_id, assigned_at);


CREATE TABLE IF NOT EXISTS repo_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_events_repo_id ON repo_events (repo_id, created_at DESC);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (owner_id, number)
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_created_at
    ON projects (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    layout VARCHAR(32) NOT NULL
        CHECK (layout IN ('TABLE', 'BOARD', 'ROADMAP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_views_project_created_at
    ON project_views (project_id, created_at);

CREATE TABLE IF NOT EXISTS project_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content_type VARCHAR(32) NOT NULL
        CHECK (content_type IN ('ISSUE', 'PULL_REQUEST')),
    content_id UUID NOT NULL,
    status VARCHAR(255) NOT NULL DEFAULT '',
    start_date TIMESTAMPTZ,
    target_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_project_items_project_created_at
    ON project_items (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_project_items_content
    ON project_items (content_type, content_id);
