import type { Branch, Repository } from "../types";
import { Loader2 } from "lucide-react";
import CommitHistory from "../components/repository/code/CommitHistory";
import CommitDiffPage from "../components/repository/code/CommitDiffPage";
import BranchesPage from "../components/repository/code/BranchesPage";
import RepoRootPage from "../components/repository/code/RepoRootPage";
import NewFilePage from "../components/repository/code/NewFilePage";
import RepoFileTreeBrowserPage from "../components/repository/code/RepoFileTreeBrowserPage";
import UploadFilesPage from "../components/repository/code/UploadFilesPage";
import IssueBoard from "../components/repository/issues/IssueBoard";
import IssueDetailPage from "../components/repository/issues/IssueDetailPage";
import RepoInsights from "../components/repository/insights/RepoInsights";
import RepoActionsPage from "../components/repository/pages/RepoActionsPage";
import RepoAgentsPage from "../components/repository/pages/RepoAgentsPage";
import RepoProjectsPage from "../components/repository/pages/RepoProjectsPage";
import RepoSecurityPage from "../components/repository/pages/RepoSecurityPage";
import RepoSettingsPage from "../components/repository/pages/RepoSettingsPage";
import RepoWikiPage from "../components/repository/pages/RepoWikiPage";
import PullRequestComparePage from "../components/repository/pulls/PullRequestComparePage";
import ConflictResolver from "../components/repository/pulls/ConflictResolver";
import PullRequestDetailPage from "../components/repository/pulls/PullRequestDetailPage";
import PullRequestBoard from "../components/repository/pulls/PullRequestBoard";
import { ActivityPage } from "../components/repository/ActivityPage";
import type { RepoContentKind } from "../utils/repoRouting";
import type { RepoTabKey } from "../utils/repoTabs";

type ExplorerLocation = {
  type: "root" | "file" | "dir";
  path?: string;
};

interface RepoWorkspaceContentProps {
  selectedRepo: Repository | null;
  currentUsername: string;
  selectedRepoVisibility: string;
  isResolvingRepo: boolean;
  isFullBrowserMode: boolean;
  activeTab: RepoTabKey;
  routeContentKind: RepoContentKind;
  routeContentPath: string;
  routeBranch: string;
  defaultBranchName: string;
  currentBranch: string;
  branches: Branch[];
  explorerInitialLocation: ExplorerLocation;
  locationSearch: string;
  onSelectBranch: (branchName: string) => void;
  onSelectCommitBranch: (branchName: string) => void;
  onNavigateRepoLocation: (location: ExplorerLocation) => void;
  onBackToFiles: () => void;
  onNavigateRepoContent: (contentKind: "root" | "tree" | "blob", contentPath: string, branchName: string) => void;
  onOpenRepoCommits: (branchName: string, search?: string) => void;
  onOpenBranches: () => void;
  onOpenCreateFile: (branchName: string, directoryPath: string) => void;
  onOpenEditFile: (branchName: string, filePath: string) => void;
  onOpenUploadFiles: (branchName: string, directoryPath: string) => void;
  onOpenRepoCompare: (baseRef?: string, headRef?: string) => void;
  onOpenFork: () => void;
  onOpenPullRequest: (pullNumber: number) => void;
  onOpenPullRequestConflicts: (pullNumber: number | string) => void;
  onBackToPullRequests: () => void;
  onOpenCreateIssue: () => void;
  onCloseCreateIssue: () => void;
  onOpenIssue: (issueNumber: number) => void;
  onBackToIssues: () => void;
  onRepoUpdated: (repo: Repository) => void;
  onRepoDeleted: (repoId: string) => void;
  onGoToProfile: () => void;
  onOpenRepoPulse: () => void;
  onOpenRepoContributors: () => void;
  onOpenRepoContributorsPeriod: (search: string) => void;
  onOpenRepoCommunity: () => void;
  onOpenRepoCommunityStandards: () => void;
  onOpenRepoCommitActivity: () => void;
}

export default function RepoWorkspaceContent({
  selectedRepo,
  currentUsername,
  isFullBrowserMode,
  activeTab,
  routeContentKind,
  routeContentPath,
  routeBranch,
  defaultBranchName,
  currentBranch,
  branches,
  explorerInitialLocation,
  locationSearch,
  onSelectBranch,
  onSelectCommitBranch,
  onNavigateRepoLocation,
  onBackToFiles,
  onNavigateRepoContent,
  onOpenRepoCommits,
  onOpenBranches,
  onOpenCreateFile,
  onOpenEditFile,
  onOpenUploadFiles,
  onOpenRepoCompare,
  onOpenFork,
  onOpenPullRequest,
  onOpenPullRequestConflicts,
  onBackToPullRequests,
  onOpenCreateIssue,
  onCloseCreateIssue,
  onOpenIssue,
  onBackToIssues,
  onRepoUpdated,
  onRepoDeleted,
  onGoToProfile,
  onOpenRepoPulse,
  onOpenRepoContributors,
  onOpenRepoContributorsPeriod,
  onOpenRepoCommunity,
  onOpenRepoCommunityStandards,
  onOpenRepoCommitActivity,
  isResolvingRepo,
}: RepoWorkspaceContentProps) {
  if (!selectedRepo) {
    if (isResolvingRepo) {
      return (
        <div
          className={isFullBrowserMode ? "w-full h-full min-h-0 flex items-center justify-center" : "max-w-[1400px] mx-auto px-4 py-6 h-full flex items-center justify-center"}
          role="status"
          aria-label="Loading repository"
        >
          <Loader2 size={28} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      );
    }

    return (
      <div className={isFullBrowserMode ? "w-full h-full min-h-0" : "max-w-[1400px] mx-auto px-4 py-6 h-full"}>
        <div className="mx-auto max-w-[560px] py-20 text-center">
          <p className="text-[64px] leading-none font-semibold text-[var(--text-primary)]">404</p>
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">This is not the repository you are looking for.</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            The repository may not exist, or you may not have access to it.
          </p>
          <button
            type="button"
            onClick={onGoToProfile}
            className="mt-6 h-9 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
          >
            Go to your profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isFullBrowserMode ? "w-full h-full min-h-0" : "max-w-[1400px] mx-auto px-4 pb-6"}>
      <div className={isFullBrowserMode ? "w-full h-full min-h-0 flex flex-col" : "w-full flex flex-col gap-4"}>
          {!isFullBrowserMode ? (
            <div className="flex flex-wrap items-center justify-between gap-3">

            </div>
          ) : null}

          <div className={isFullBrowserMode ? "w-full flex-1 min-h-0 flex flex-col" : "flex-1 min-h-0"}>
            {activeTab === "files" && routeContentKind === "commits" && (
              <CommitHistory
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                branch={currentBranch || routeBranch || defaultBranchName}
                branches={branches}
                onSelectBranch={onSelectCommitBranch}
                onBack={onBackToFiles}
                onBrowseAtCommit={(commitHash) => onNavigateRepoContent("tree", "", commitHash)}
              />
            )}
            {activeTab === "files" && routeContentKind === "commit-view" && (
              <CommitDiffPage
                repoId={selectedRepo.id}
                commitHash={routeContentPath}
                repoOwner={selectedRepo.owner || currentUsername}
                repoName={selectedRepo.name}
                onBrowseFiles={(hash) => onNavigateRepoContent("tree", "", hash)}
              />
            )}
            {activeTab === "files" && routeContentKind === "branches" && (
              <BranchesPage
                repoId={selectedRepo.id}
                onBackToCode={onBackToFiles}
              />
            )}
            {activeTab === "files" && routeContentKind === "new" && (
              <NewFilePage
                mode="create"
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                branch={currentBranch || routeBranch || defaultBranchName}
                branches={branches}
                initialDirectoryPath={routeContentPath}
                onSelectBranch={onSelectBranch}
                onCancel={() => onNavigateRepoContent("tree", routeContentPath, currentBranch || routeBranch || defaultBranchName)}
                onCommitted={(createdFilePath: string, newBranchName?: string) => {
                  if (newBranchName) {
                    onOpenRepoCompare(currentBranch || defaultBranchName, newBranchName);
                  } else {
                    onNavigateRepoContent("blob", createdFilePath, currentBranch || routeBranch || defaultBranchName);
                  }
                }}
              />
            )}
            {activeTab === "files" && routeContentKind === "edit" && (
              <NewFilePage
                mode="edit"
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                branch={currentBranch || routeBranch || defaultBranchName}
                branches={branches}
                initialFilePath={routeContentPath}
                onSelectBranch={onSelectBranch}
                onCancel={() => onNavigateRepoContent("blob", routeContentPath, currentBranch || routeBranch || defaultBranchName)}
                onCommitted={(updatedFilePath: string, newBranchName?: string) => {
                  if (newBranchName) {
                    onOpenRepoCompare(currentBranch || defaultBranchName, newBranchName);
                  } else {
                    onNavigateRepoContent("blob", updatedFilePath, currentBranch || routeBranch || defaultBranchName);
                  }
                }}
              />
            )}
            {activeTab === "files" && routeContentKind === "upload" && (
              <UploadFilesPage
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                branch={currentBranch || routeBranch || defaultBranchName}
                initialDirectoryPath={routeContentPath}
                onCancel={() => onNavigateRepoContent("tree", routeContentPath, currentBranch || routeBranch || defaultBranchName)}
                onCommitted={(targetDirectoryPath: string, newBranchName?: string) => {
                  if (newBranchName) {
                    onOpenRepoCompare(currentBranch || defaultBranchName, newBranchName);
                  } else {
                    onNavigateRepoContent("tree", targetDirectoryPath, currentBranch || routeBranch || defaultBranchName);
                  }
                }}
              />
            )}
            {activeTab === "files" && (routeContentKind === "tree" || routeContentKind === "blob") && (
              <RepoFileTreeBrowserPage
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                branch={currentBranch || routeBranch || defaultBranchName}
                branches={branches}
                initialLocation={explorerInitialLocation}
                onNavigateLocation={onNavigateRepoLocation}
                onSelectBranch={onSelectBranch}
                onOpenCommitHistory={(branchName) => onOpenRepoCommits(branchName, locationSearch)}
                onOpenCreateFile={onOpenCreateFile}
                onOpenEditFile={onOpenEditFile}
                onOpenUploadFiles={onOpenUploadFiles}
                onOpenRepoCompare={onOpenRepoCompare}
                repoOwner={selectedRepo.owner || currentUsername}
                currentUsername={currentUsername}
              />
            )}
            {activeTab === "files" && routeContentKind === "root" && (
              <RepoRootPage
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                repoDescription={selectedRepo.description}
                repoWebsite={selectedRepo.website}
                repoTopics={selectedRepo.topics}
                repoOwner={selectedRepo.owner || currentUsername}
                repoVisibility={selectedRepo.visibility}
                repoStars={selectedRepo.stars}
                repoForks={selectedRepo.forks}
                repoWatchers={selectedRepo.watchers}
                cloneUrl={selectedRepo.clone_url}
                parentId={selectedRepo.parent_id}
                branch={currentBranch || routeBranch || defaultBranchName}
                branches={branches}
                initialLocation={explorerInitialLocation}
                onNavigateLocation={onNavigateRepoLocation}
                onSelectBranch={onSelectBranch}
                onOpenCommitHistory={(branchName) => onOpenRepoCommits(branchName)}
                onOpenBranches={onOpenBranches}
                onOpenCreateFile={onOpenCreateFile}
                onOpenUploadFiles={onOpenUploadFiles}
                onOpenRepoCompare={onOpenRepoCompare}
                currentUsername={currentUsername}
                onOpenFork={onOpenFork}
              />
            )}
            {activeTab === "issues" && routeContentKind === "issue-view" && (
              <IssueDetailPage
                repoId={selectedRepo.id}
                currentUsername={currentUsername}
                issueNumber={routeContentPath}
                onBack={onBackToIssues}
                onOpenCreate={onOpenCreateIssue}
              />
            )}
            {activeTab === "issues" && routeContentKind !== "issue-view" && (
              <IssueBoard
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                repoOwner={selectedRepo.owner || currentUsername}
                currentUsername={currentUsername}
                isCreating={routeContentKind === "issues-new"}
                onOpenCreate={onOpenCreateIssue}
                onCloseCreate={onCloseCreateIssue}
                onOpenIssue={onOpenIssue}
              />
            )}
            {activeTab === "pulls" && routeContentKind === "compare" && (
              <PullRequestComparePage
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                repoOwner={selectedRepo.owner || currentUsername}
                branches={branches}
                defaultBaseBranch={defaultBranchName}
                defaultHeadBranch={currentBranch || defaultBranchName}
                compareRange={routeContentPath}
                onSelectCompareRefs={(baseRef, headRef) => onOpenRepoCompare(baseRef, headRef)}
                onOpenPullRequest={onOpenPullRequest}
              />
            )}
            {activeTab === "pulls" && routeContentKind === "pull-conflicts" && (
              <ConflictResolver
                repoId={selectedRepo.id}
                pullNumber={routeContentPath}
                onResolved={() => onOpenPullRequest(Number(routeContentPath))}
                onBack={() => onOpenPullRequest(Number(routeContentPath))}
              />
            )}
            {activeTab === "pulls" && routeContentKind === "pull-view" && (
              <PullRequestDetailPage
                repoId={selectedRepo.id}
                currentUsername={currentUsername}
                pullNumber={routeContentPath}
                onBack={onBackToPullRequests}
                onOpenConflicts={() => onOpenPullRequestConflicts(routeContentPath)}
                onOpenPullRequest={onOpenPullRequest}
              />
            )}
            {activeTab === "pulls" && routeContentKind !== "compare" && routeContentKind !== "pull-view" && routeContentKind !== "pull-conflicts" && (
              <PullRequestBoard
                repoId={selectedRepo.id}
                currentUsername={currentUsername}
                onOpenCompare={() => onOpenRepoCompare()}
                onOpenPullRequest={onOpenPullRequest}
              />
            )}
            {activeTab === "agents" && <RepoAgentsPage />}
            {activeTab === "actions" && <RepoActionsPage />}
            {activeTab === "projects" && <RepoProjectsPage />}
            {activeTab === "wiki" && <RepoWikiPage repoName={selectedRepo.name} />}
            {activeTab === "security" && <RepoSecurityPage />}
            {activeTab === "insights" && (
              <RepoInsights
                repoId={selectedRepo.id}
                repoOwner={selectedRepo.owner}
                repoName={selectedRepo.name}
                contentKind={routeContentKind}
                locationSearch={locationSearch}
                onOpenPulse={onOpenRepoPulse}
                onOpenContributors={onOpenRepoContributors}
                onOpenContributorsPeriod={onOpenRepoContributorsPeriod}
                onOpenCommunity={onOpenRepoCommunity}
                onOpenCommunityStandards={onOpenRepoCommunityStandards}
                onOpenCommitActivity={onOpenRepoCommitActivity}
              />
            )}
            {activeTab === "activity" && <ActivityPage repoId={selectedRepo.id} />}
            {activeTab === "settings" && (
              <RepoSettingsPage
                repo={selectedRepo}
                onRepoUpdated={onRepoUpdated}
                onRepoDeleted={onRepoDeleted}
              />
            )}
          </div>
        </div>
    </div>
  );
}
