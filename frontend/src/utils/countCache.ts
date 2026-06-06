// Client-side cache for tab count badges. Showing the last known count on
// initial render avoids a layout shift when the freshly fetched value arrives.
// The cached value is reconciled after each fetch: identical values change
// nothing, a different value updates both the badge and the cache.

const PREFIX = "synergit:count:";

export function readCachedCount(key: string): number | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) {
      return null;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeCachedCount(key: string, value: number): void {
  try {
    localStorage.setItem(PREFIX + key, String(value));
  } catch {
    /* ignore storage unavailability / quota errors */
  }
}

export function repoCountCacheKey(username: string): string {
  return `repos:${username}`;
}

export function starredCountCacheKey(username: string): string {
  return `stars:${username}`;
}

// Per-repo Issues/Pull requests tab counts, keyed by owner/name so they can be
// read on a cold load (from the URL) before the repositories list resolves.
export interface RepoTabCounts {
  issues: number;
  pulls: number;
}

export function repoTabCountsCacheKey(owner: string, name: string): string {
  return `repo-tabs:${owner}/${name}`;
}

export function readRepoTabCounts(key: string): RepoTabCounts | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) {
      return null;
    }
    const parsed = JSON.parse(raw) as { issues?: unknown; pulls?: unknown };
    const issues = Number(parsed.issues);
    const pulls = Number(parsed.pulls);
    if (!Number.isFinite(issues) || !Number.isFinite(pulls)) {
      return null;
    }
    return { issues, pulls };
  } catch {
    return null;
  }
}

export function writeRepoTabCounts(key: string, value: RepoTabCounts): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore storage unavailability / quota errors */
  }
}
