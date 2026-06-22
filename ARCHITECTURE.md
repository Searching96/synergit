# Synergit Microservice Architecture

Assumption: Synergit has been split into three services: Core, Insight, and Git Repo.

```mermaid
flowchart LR
    Browser["React Web UI"]
    GitClient["Git CLI"]

    Core["Core Service\nweb API, auth, repos, issues, PRs"]
    Insight["Insight Service\nrepository analytics and charts"]
    GitRepo["Git Repo Service\nbare repo storage and Git operations"]

    CoreDB[("Core relational DB\nschema: core")]
    InsightDB[("Insight relational DB\nschema: insight")]
    Disk[("Hard disk\nbare Git repositories")]

    Browser -->|"HTTP /api/*"| Core
    GitClient -->|"Git smart HTTP"| Core

    Core -->|"analytics requests"| Insight
    Core -->|"repo read/write/merge/conflict ops"| GitRepo
    Insight -->|"git history reads"| GitRepo

    Core --> CoreDB
    Insight --> InsightDB
    GitRepo --> Disk
```

## Components

| Component | Responsibility |
|---|---|
| React Web UI | Browser application for all user workflows. |
| Core Service | Main web service: auth, repo metadata, collaborators, issues, pull requests, labels, stars, and API orchestration. |
| Insight Service | Computes and serves repository analytics such as pulse, contributors, commit activity, and code frequency. |
| Git Repo Service | Owns bare repositories on disk and exposes Git operations over HTTP. |
| Core DB | Relational source of truth for product data. |
| Insight DB | Relational storage for analytics snapshots. |
| Hard disk | Filesystem storage for bare Git repositories. |

## Schema Files

| Service | Schema file |
|---|---|
| Core Service | `core_schema.sql` |
| Insight Service | `insight_schema.sql` |
| Git Repo Service | None; uses hard disk storage. |
