# Frontend Architecture Summary (Current Progress)

## Stack
- React 19 + TypeScript with Vite.
- Tailwind CSS v4 for styling.
- `lucide-react` for icons.
- ESLint + TypeScript tooling for code quality.

## High-Level Structure
- Entry point: `frontend/src/main.tsx` renders `App` inside `StrictMode`.
- App shell: `frontend/src/App.tsx` manages global UI state and main layout.
- Feature components:
  - `frontend/src/components/Auth.tsx`: login/register flow.
  - `frontend/src/components/FileExplorer.tsx`: repository tree + file content viewer.
  - `frontend/src/components/CommitHistory.tsx`: commit timeline view.
- API layer:
  - `frontend/src/services/api/client.ts`: centralized fetch wrapper, auth header injection, error handling.
  - `frontend/src/services/api/auth.ts` and `frontend/src/services/api/repos.ts`: endpoint-specific API methods.
- Shared contracts:
  - `frontend/src/types/index.ts`: domain types (`Repository`, `RepoFile`, `Commit`, `Branch`).

## Current State Management Pattern
- Local component state with React hooks (`useState`, `useEffect`).
- `App.tsx` acts as orchestration layer:
  - Auth gate (`token` from `localStorage`).
  - Repository selection.
  - Branch selection per repository.
  - Tab switching between code and commits.
- Child components fetch their own feature data via `reposApi` using props (`repoId`, `branch`).

## Data Flow
1. User authenticates via `Auth` component.
2. Token is stored in `localStorage`.
3. Shared `fetcher` attaches `Authorization: Bearer <token>` for API requests.
4. `App` loads repositories and branch metadata.
5. Feature components request and render tree/blob/commit data.

## UI Architecture (Current)
- Two-pane app layout:
  - Left sidebar: repository list.
  - Main panel: repository header, branch selector, tabbed content.
- Feature rendering is conditional and state-driven (authenticated vs unauthenticated, selected repo vs empty state, files vs commits).

## What This Implies at Current Stage
- Clear separation between view components, API transport, and shared types.
- Simple and understandable architecture suitable for current scope.
- Main scaling pressure point is centralized state in `App.tsx`; if features grow, introducing a dedicated state layer (context or store) would improve maintainability.
