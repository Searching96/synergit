import { useState, useEffect, useCallback } from 'react';
import type { Branch } from '../types/index';
import { reposApi } from '../services/api';

export function useRepoBranches(selectedRepoId: string | null, isAuthenticated: boolean) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);

  const refreshBranches = useCallback(() => {
    if (!selectedRepoId || !isAuthenticated) return;

    reposApi.getBranches(selectedRepoId)
      .then((data) => {
        const branchList = data || [];
        setBranches(branchList);

        const defaultBranch = branchList.find((b) => b.is_default)?.name || branchList[0]?.name || '';

        setCurrentBranch((prev) => {
          if (prev && branchList.some((b) => b.name === prev)) {
            return prev;
          }
          return defaultBranch;
        });

      })
      .catch(console.error);
  }, [selectedRepoId, isAuthenticated]);

  useEffect(() => {
    if (selectedRepoId && isAuthenticated) {
      refreshBranches();
    }
  }, [selectedRepoId, isAuthenticated, refreshBranches]);

  return {
    branches,
    setBranches,
    currentBranch,
    setCurrentBranch,
    refreshBranches,
  };
}
