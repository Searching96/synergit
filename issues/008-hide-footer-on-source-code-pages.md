---
id: 008
title: "Hide Footer on Source Code Pages"
status: "closed"
created_at: "2026-06-13T19:48:00Z"
closed_at: "2026-06-13T19:48:00Z"
labels: ["bug", "ui", "ux"]
component: "Frontend"
---

# Hide Footer on Source Code Pages

## Description
The global `Footer` component was appearing on pages that display source code content (e.g. file explorer, blob viewer, commit history, diffs). Since these pages often utilize a dense or full-screen layout, the footer was disruptive to the UI layout and UX.

## Acceptance Criteria
- [x] Footer should not render when viewing repository code/files (i.e. `activeTab === 'files'` in `viewMode === 'repo'`).
- [x] Ensure Footer still renders normally on all other pages.
- [x] Resolve `useSetPageReady` missing reference error in `GlobalPlaceholderPage.tsx` caused by previous refactors.
- [x] Ensure 0 warnings and 0 errors remaining from the frontend linter (`npm run lint`).

## Implementation Notes
- Added a `showFooter` boolean calculation in `App.tsx` based on `viewMode` and `activeTab`.
- Wrapped `<Footer />` inside `{showFooter && <Footer />}` inside `App.tsx` main return statement.
- Imported `useSetPageReady` from context into `GlobalPlaceholderPage.tsx` to fix TypeScript compilation error.
- Fixed residual `react-hooks/exhaustive-deps` warnings in `App.tsx` and `FileExplorer.tsx`.
