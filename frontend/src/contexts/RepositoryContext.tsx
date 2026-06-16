/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Repository, Branch, CreateRepositoryPayload } from '../types/index';
import { reposApi } from '../services/api';
import type { ForkRepositoryPayload } from '../services/api/repos';
import { useAuth } from './AuthContext';
import { useRepositories } from '../hooks/useRepositories';
import { useRepoBranches } from '../hooks/useRepoBranches';

interface RepositoryContextType {
  repos: Repository[];
  profileRepoCount: number;
  profileRepoCountPending: boolean;
  profileRepositoriesPending: boolean;
  profileFetchFailed: boolean;
  selectedRepoId: string | null;
  selectedRepo: Repository | null;
  branches: Branch[];
  currentBranch: string | null;
  
  setSelectedRepoId: (id: string | null) => void;
  setCurrentBranch: (branch: string | null) => void;
  refreshBranches: () => void;
  hydratePrimaryLanguagesFromInsights: (repositories: Repository[]) => Promise<void>;
  handleRepoUpdated: (updatedRepo: Repository) => void;
  handleRepoDeleted: (repoId: string) => void;
  handleCreateRepository: (payload: CreateRepositoryPayload) => Promise<Repository>;
  handleForkRepository: (repoId: string, payload: ForkRepositoryPayload) => Promise<Repository>;
  clearState: () => void;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentUsername, logout } = useAuth();
  
  const {
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
  } = useRepositories(isAuthenticated, currentUsername, logout);

  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const {
    branches,
    setBranches,
    currentBranch,
    setCurrentBranch,
    refreshBranches,
  } = useRepoBranches(selectedRepoId, isAuthenticated);

  const selectedRepo = repos.find((repo) => repo.id === selectedRepoId) || null;

  const clearState = useCallback(() => {
    setRepos([]);
    setProfileRepoCount(0);
    setSelectedRepoId(null);
    setBranches([]);
    setCurrentBranch(null);
    setProfileFetchFailed(false);
  }, [setRepos, setProfileRepoCount, setBranches, setCurrentBranch, setProfileFetchFailed]);

  const handleCreateRepository = async (payload: CreateRepositoryPayload): Promise<Repository> => {
    const createdRepoResponse = await reposApi.createRepo(payload);
    const createdRepo: Repository = {
      ...createdRepoResponse,
      description: createdRepoResponse.description ?? payload.description,
      visibility: createdRepoResponse.visibility ?? payload.visibility ?? 'PUBLIC',
    };

    setRepos((prev) => {
      const withoutCreated = prev.filter((repo) => repo.id !== createdRepo.id);
      return [createdRepo, ...withoutCreated];
    });
    setProfileRepoCount((count) => count + 1);
    setSelectedRepoId(createdRepo.id);
    return createdRepo;
  };

  const handleForkRepository = async (repoId: string, payload: ForkRepositoryPayload): Promise<Repository> => {
    const forkedRepoResponse = await reposApi.forkRepository(repoId, payload);
    const forkedRepo: Repository = {
      ...forkedRepoResponse,
    };

    setRepos((prev) => {
      const withoutCreated = prev.filter((repo) => repo.id !== forkedRepo.id);
      return [forkedRepo, ...withoutCreated];
    });
    setProfileRepoCount((count) => count + 1);
    setSelectedRepoId(forkedRepo.id);
    return forkedRepo;
  };

  return (
    <RepositoryContext.Provider value={{
      repos, profileRepoCount, profileRepoCountPending, profileRepositoriesPending, profileFetchFailed,
      selectedRepoId, selectedRepo, branches, currentBranch,
      setSelectedRepoId, setCurrentBranch, refreshBranches, hydratePrimaryLanguagesFromInsights,
      handleRepoUpdated, handleRepoDeleted, handleCreateRepository, handleForkRepository, clearState
    }}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository() {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
}
