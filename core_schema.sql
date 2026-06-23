CREATE SCHEMA IF NOT EXISTS core;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS core.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.repositories (
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
    parent_id UUID REFERENCES core.repositories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_core_repositories_created_at
    ON core.repositories (created_at);
CREATE INDEX IF NOT EXISTS idx_core_repositories_name
    ON core.repositories (name);
CREATE INDEX IF NOT EXISTS idx_core_repositories_primary_language
    ON core.repositories (primary_language);

CREATE TABLE IF NOT EXISTS core.repository_collaborators (
    repository_id UUID NOT NULL REFERENCES core.repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('OWNER', 'MAINTAINER', 'WRITE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repository_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_core_repository_collaborators_user
    ON core.repository_collaborators (user_id);

CREATE TABLE IF NOT EXISTS core.issues (
    id UUID PRIMARY KEY,
    repo_id UUID NOT NULL REFERENCES core.repositories(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'CLOSED')),
    close_reason VARCHAR(24)
        CHECK (close_reason IN ('COMPLETED', 'NOT_PLANNED', 'DUPLICATE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_issues_repo_created_at
    ON core.issues (repo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_issues_repo_status
    ON core.issues (repo_id, status);

CREATE TABLE IF NOT EXISTS core.pull_requests (
    id UUID PRIMARY KEY,
    repo_id UUID NOT NULL REFERENCES core.repositories(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_core_pull_requests_repo_created_at
    ON core.pull_requests (repo_id, created_at DESC);

CREATE TABLE IF NOT EXISTS core.labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES core.repositories(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#cccccc',
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (repo_id, name)
);

CREATE INDEX IF NOT EXISTS idx_core_labels_repo
    ON core.labels (repo_id);

CREATE TABLE IF NOT EXISTS core.issue_assignees (
    issue_id UUID NOT NULL REFERENCES core.issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (issue_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_core_issue_assignees_issue_assigned_at
    ON core.issue_assignees (issue_id, assigned_at);

CREATE TABLE IF NOT EXISTS core.issue_labels (
    issue_id UUID NOT NULL REFERENCES core.issues(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES core.labels(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_core_issue_labels_issue
    ON core.issue_labels (issue_id);

CREATE TABLE IF NOT EXISTS core.issue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES core.issues(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_issue_events_issue
    ON core.issue_events (issue_id, created_at);

CREATE TABLE IF NOT EXISTS core.issue_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES core.issues(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_issue_comments_issue
    ON core.issue_comments (issue_id, created_at);

CREATE TABLE IF NOT EXISTS core.issue_linked_branches (
    issue_id UUID NOT NULL REFERENCES core.issues(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (issue_id, branch_name)
);

CREATE TABLE IF NOT EXISTS core.issue_relationships (
    blocking_issue_id UUID NOT NULL REFERENCES core.issues(id) ON DELETE CASCADE,
    blocked_issue_id UUID NOT NULL REFERENCES core.issues(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocking_issue_id, blocked_issue_id),
    CHECK (blocking_issue_id <> blocked_issue_id)
);

CREATE INDEX IF NOT EXISTS idx_core_issue_relationships_blocked
    ON core.issue_relationships (blocked_issue_id, linked_at);
CREATE INDEX IF NOT EXISTS idx_core_issue_relationships_blocking
    ON core.issue_relationships (blocking_issue_id, linked_at);

CREATE TABLE IF NOT EXISTS core.pull_request_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pull_request_id UUID NOT NULL REFERENCES core.pull_requests(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_pull_request_events_pull_request
    ON core.pull_request_events (pull_request_id, created_at);

CREATE TABLE IF NOT EXISTS core.pull_request_labels (
    pull_request_id UUID NOT NULL REFERENCES core.pull_requests(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES core.labels(id) ON DELETE CASCADE,
    PRIMARY KEY (pull_request_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_core_pr_labels_pr
    ON core.pull_request_labels (pull_request_id);

CREATE TABLE IF NOT EXISTS core.pull_request_assignees (
    pull_request_id UUID NOT NULL REFERENCES core.pull_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (pull_request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_core_pr_assignees_pr
    ON core.pull_request_assignees (pull_request_id, assigned_at);

CREATE TABLE IF NOT EXISTS core.pull_request_linked_issues (
    pull_request_id UUID NOT NULL REFERENCES core.pull_requests(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES core.issues(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (pull_request_id, issue_id)
);

CREATE TABLE IF NOT EXISTS core.repo_stars (
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    repo_id UUID NOT NULL REFERENCES core.repositories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, repo_id)
);

CREATE INDEX IF NOT EXISTS idx_core_repo_stars_repo
    ON core.repo_stars (repo_id);
CREATE INDEX IF NOT EXISTS idx_core_repo_stars_user
    ON core.repo_stars (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS core.repo_watchers (
    repo_id UUID NOT NULL REFERENCES core.repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_core_repo_watchers_repo
    ON core.repo_watchers (repo_id);
CREATE INDEX IF NOT EXISTS idx_core_repo_watchers_user
    ON core.repo_watchers (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS core.repo_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES core.repositories(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_repo_events_repo_id
    ON core.repo_events (repo_id, created_at DESC);

CREATE TABLE IF NOT EXISTS core.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (owner_id, number)
);

CREATE INDEX IF NOT EXISTS idx_core_projects_owner_created_at
    ON core.projects (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS core.project_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    layout VARCHAR(32) NOT NULL
        CHECK (layout IN ('TABLE', 'BOARD', 'ROADMAP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_project_views_project_created_at
    ON core.project_views (project_id, created_at);

CREATE TABLE IF NOT EXISTS core.project_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_core_project_items_project_created_at
    ON core.project_items (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_core_project_items_content
    ON core.project_items (content_type, content_id);
