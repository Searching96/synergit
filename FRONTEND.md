# Synergit Frontend Architecture & Best Practices

This document outlines the current state of the Synergit frontend (React + Vite + Tailwind), the recommended best practices, and the actionable plan to refactor the codebase into a maintainable, scalable architecture.

## 1. Current State Analysis

The current frontend codebase is functionally correct but suffers from severe organizational and architectural debt. The primary issues are:

### 💥 The "God Component" (`App.tsx`)
`App.tsx` is nearly 40KB and over 1,000 lines long. It acts as a God Object that simultaneously manages:
- **Custom Routing:** Manually parsing `window.location` and maintaining complex route states (`viewMode`, `activeTab`, `routeContentKind`, etc.).
- **Global State:** Holding the entire application state (`repos`, `branches`, `selectedRepoId`, authentication state) using dozens of `useState` hooks.
- **Data Fetching:** Using raw `useEffect` hooks to fetch data from the API, leading to manual tracking of `loading` and `error` states.

### 💥 Poor Directory Structure
Everything is dumped into the `src/components/` directory. Route-level pages (e.g., `AccountSettingsPage`), domain-specific complex layouts (`RepoWorkspaceContent`), and generic UI elements are mixed together without a clear hierarchy.

### 💥 Lack of Modern React Tooling
- **No Router:** The app lacks a declarative routing library.
- **No Server State Management:** Relying on `useEffect` for API calls instead of a caching layer.
- **No Client State Management:** Relying on heavy prop-drilling from `App.tsx` to deeply nested components.

---

## 2. Target Architecture & Conventions

To ensure the frontend is scalable and maintainable, we will adopt the following conventions and libraries:

### 2.1. Standardized Directory Structure
We will move away from a flat `components/` folder to a more feature-driven architecture:

- `src/pages/`: Contains route-level components. These components do not contain complex logic; they simply map a URL route to a Feature.
- `src/features/`: Contains domain-specific logic. Grouped by feature (e.g., `features/auth`, `features/repository`, `features/profile`). Each feature folder can have its own `components/`, `hooks/`, and `api/`.
- `src/components/`: Reserved **strictly** for generic, reusable UI components (e.g., `Button`, `Modal`, `Dropdown`, `Input`).
- `src/hooks/`: Global custom hooks that are shared across multiple features.
- `src/store/`: Global client state management.
- `src/lib/` or `src/utils/`: Utility functions and third-party library configurations (e.g., Axios instance).

### 2.2. Recommended Stack Additions
- **Routing:** Use `react-router-dom` v6+ (or `@tanstack/react-router`) for declarative, nested routing.
- **Server State / Data Fetching:** Use `@tanstack/react-query` (React Query) to handle all API calls. This will eliminate `useEffect` fetching, automatically cache data, and handle loading/error states out of the box.
- **Client State:** Use `Zustand` for lightweight global state (e.g., currently authenticated user, UI theme) to eliminate prop-drilling.

---

## 3. Refactoring Action Plan

The refactoring will be executed in phases to ensure the application remains functional at each step.

### Phase 1: Structural Reorganization (Low Risk)
1. Create the `src/pages/`, `src/features/`, and `src/components/ui/` directories.
2. Move generic layout components (TopHeader, SidebarMenu) to `src/components/layout/`.
3. Move top-level page components (e.g., `CreateRepositoryPage`, `AccountSettingsPage`) to `src/pages/`.
4. Group repository-specific components under `src/features/repository/` and profile components under `src/features/profile/`.

### Phase 2: Implement Declarative Routing (Medium Risk)
1. Install `react-router-dom`.
2. Replace the custom `applyRoute` and `window.location` parsing logic in `App.tsx` with a standard `<BrowserRouter>` and `<Routes>` setup.
3. Define explicit route paths:
   - `/` (Home/Auth)
   - `/:username` (Profile Page)
   - `/:username/:repoName/*` (Repository Workspace)
   - `/settings/account` (Settings)
4. Replace manual `navigateToPath` calls with the `useNavigate` hook or `<Link>` components.

### Phase 3: Introduce React Query for Server State (High Impact)
1. Install `@tanstack/react-query`.
2. Wrap the app in `<QueryClientProvider>`.
3. Migrate API calls (e.g., `reposApi.getRepos`, `reposApi.getBranches`) from `useEffect` inside `App.tsx` to custom hooks (e.g., `useRepositories()`, `useBranches()`).
4. Remove the sprawling `useState` arrays for data from `App.tsx`. Components that need data will simply call the React Query hooks directly.

### Phase 4: Dismantle the God Component (`App.tsx`)
1. Extract global client state (like `isAuthenticated` or `searchQuery`) into a `Zustand` store if Context is not sufficient.
2. Reduce `App.tsx` down to just the root Providers (`QueryClientProvider`, `RouterProvider`, `ThemeProvider`) and the main Layout shell.

---
*Note: This frontend refactor should be executed independently of backend changes, ensuring API contracts are strictly maintained during the transition.*
