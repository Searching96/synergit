import { useEffect, useMemo, useState } from "react";
import type { Commit } from "../../../../types";
import { reposApi } from "../../../../services/api";

export type LatestCommitMap = Record<string, Commit | null>;

export function useLatestCommitMap(
  repoId: string,
  branch: string,
  paths: string[],
): LatestCommitMap {
  const [commitMap, setCommitMap] = useState<LatestCommitMap>({});

  const normalizedPaths = useMemo(() => {
    const deduped = new Set<string>();
    for (const path of paths) {
      const normalized = path.trim();
      if (!normalized) {
        continue;
      }
      deduped.add(normalized);
    }

    return Array.from(deduped);
  }, [paths]);

  useEffect(() => {
    setCommitMap({});
  }, [repoId, branch]);

  useEffect(() => {
    const missingPaths = normalizedPaths.filter((path) => !(path in commitMap));
    if (!repoId || missingPaths.length === 0) {
      return;
    }

    let active = true;

    void Promise.all(
      missingPaths.map(async (path) => {
        try {
          const commits = await reposApi.getCommits(repoId, branch, path);
          return [path, commits[0] || null] as const;
        } catch {
          return [path, null] as const;
        }
      }),
    ).then((entries) => {
      if (!active) {
        return;
      }

      setCommitMap((prev) => {
        const next = { ...prev };
        for (const [path, commit] of entries) {
          if (!(path in next)) {
            next[path] = commit;
          }
        }
        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [branch, commitMap, normalizedPaths, repoId]);

  return commitMap;
}
