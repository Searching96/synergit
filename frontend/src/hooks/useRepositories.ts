import { useState, useEffect, useCallback } from 'react';
import type { Repository } from '../types/index';
import { reposApi, ApiError } from '../services/api';
import { repoCountCacheKey, writeCachedCount } from '../utils/countCache';
import { isRepositoryOwnedByUser } from '../utils/profileUtils';

export function useRepositories(isAuthenticated: boolean, currentUsername: string, logout: () => void) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [profileRepoCount, setProfileRepoCount] = useState<number>(0);
  const [profileRepoCountPending, setProfileRepoCountPending] = useState<boolean>(true);
  const [profileRepositoriesPending, setProfileRepositoriesPending] = useState<boolean>(true);
  const [profileFetchFailed, setProfileFetchFailed] = useState<boolean>(false);

  const hydratePrimaryLanguagesFromInsights = useCallback(async (repositories: Repository[]) => {
    const missingLanguageRepos = repositories.filter((repo) => {
      const resolved = (repo.primary_language || repo.language || "").trim();
      return resolved.length === 0;
    });

    if (missingLanguageRepos.length === 0) return;

    const results = await Promise.allSettled(
      missingLanguageRepos.map(async (repo) => {
        const snapshot = await reposApi.getInsights(repo.id);
        const primaryLanguage = (
          snapshot.primary_language ||
          snapshot.language_breakdown?.[0]?.language ||
          ""
        ).trim();

        if (!primaryLanguage) return null;

        return { repoId: repo.id, primaryLanguage };
      }),
    );

    const primaryLanguageByRepoId = new Map<string, string>();
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        primaryLanguageByRepoId.set(result.value.repoId, result.value.primaryLanguage);
      }
    }

    if (primaryLanguageByRepoId.size === 0) return;

    setRepos((prev) => prev.map((repo) => {
      const primaryLanguage = primaryLanguageByRepoId.get(repo.id);
      if (!primaryLanguage) return repo;

      const existingPrimary = (repo.primary_language || "").trim();
      if (existingPrimary === primaryLanguage) return repo;

      return {
        ...repo,
        primary_language: primaryLanguage,
        language: (repo.language || primaryLanguage).trim(),
      };
    }));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    setProfileRepoCountPending(true);
    reposApi.getRepoCount()
      .then(({ count }) => {
        if (cancelled) return;
        setProfileFetchFailed(false);
        setProfileRepoCountPending(false);
        setProfileRepoCount(count);
        writeCachedCount(repoCountCacheKey(currentUsername), count);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        if (err instanceof ApiError && err.status === 401) {
          logout();
          return;
        }
        setProfileFetchFailed(true);
        setProfileRepoCountPending(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, currentUsername, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    setProfileRepositoriesPending(true);
    reposApi.getRepos()
      .then((data) => {
        if (cancelled) return;

        const repositories = data || [];
        setProfileFetchFailed(false);
        setProfileRepositoriesPending(false);
        setRepos(repositories);
        
        const ownedCount = repositories.filter((repo) => isRepositoryOwnedByUser(repo, currentUsername)).length;
        setProfileRepoCount(ownedCount);
        writeCachedCount(repoCountCacheKey(currentUsername), ownedCount);
        
        void hydratePrimaryLanguagesFromInsights(repositories);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        if (err instanceof ApiError && err.status === 401) {
          logout();
          return;
        }
        setProfileFetchFailed(true);
        setProfileRepositoriesPending(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, currentUsername, hydratePrimaryLanguagesFromInsights, logout]);

  const handleRepoUpdated = useCallback((updatedRepo: Repository) => {
    setRepos((prev) => prev.map((repo) => (repo.id === updatedRepo.id ? { ...repo, ...updatedRepo } : repo)));
  }, []);

  const handleRepoDeleted = useCallback((repoId: string) => {
    setRepos((prev) => prev.filter((repo) => repo.id !== repoId));
    setProfileRepoCount((count) => Math.max(0, count - 1));
  }, []);

  return {
    repos,
    setRepos,
    profileRepoCount,
    setProfileRepoCount,
    profileRepoCountPending,
    profileRepositoriesPending,
    profileFetchFailed,
    setProfileFetchFailed,
    hydratePrimaryLanguagesFromInsights,
    handleRepoUpdated,
    handleRepoDeleted,
  };
}
