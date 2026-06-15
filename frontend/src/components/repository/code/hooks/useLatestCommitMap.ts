import { useEffect, useMemo, useRef, useState } from "react";
import type { Commit } from "../../../../types";
import { reposApi } from "../../../../services/api";

export type LatestCommitMap = Record<string, Commit | null>;

export function useLatestCommitMap(
  repoId: string,
  branch: string,
  paths: string[],
): { commitMap: LatestCommitMap; isLoading: boolean } {
  const [commitMap, setCommitMap] = useState<LatestCommitMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const fetchedPathsRef = useRef<Set<string>>(new Set());

  const pathsString = JSON.stringify(paths);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsString]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommitMap({});
    fetchedPathsRef.current.clear();
  }, [repoId, branch]);

  useEffect(() => {
    const missingPaths = normalizedPaths.filter((path) => !fetchedPathsRef.current.has(path));
    if (!repoId || missingPaths.length === 0) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    missingPaths.forEach(p => fetchedPathsRef.current.add(p));

    reposApi.getCommitsBatch(repoId, branch, missingPaths)
      .then((batchResult) => {
        if (!active) {
          return;
        }

        setCommitMap((prev) => {
          const next = { ...prev };
          for (const [path, commit] of Object.entries(batchResult)) {
            if (!(path in next)) {
              next[path] = commit;
            }
          }
          return next;
        });
      })
      .catch((err) => {
        console.error("Failed to fetch commits batch:", err);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [branch, normalizedPaths, repoId]);

  return { commitMap, isLoading };
}
