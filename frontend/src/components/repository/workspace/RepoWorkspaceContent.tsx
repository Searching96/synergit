import type { Branch, Repository } from "../../../types";
import CommitHistory from "../code/CommitHistory";
import FileExplorer from "../code/FileExplorer";
import NewFilePage from "../code/NewFilePage";
import RepoTreeBrowserPage from "../code/RepoTreeBrowserPage";
import UploadFilesPage from "../code/UploadFilesPage";
import IssueBoard from "../issues/IssueBoard";
import RepoInsights from "../insights/RepoInsights";
import RepoActionsPage from "../pages/RepoActionsPage";
import RepoAgentsPage from "../pages/RepoAgentsPage";
import RepoProjectsPage from "../pages/RepoProjectsPage";
import RepoSecurityPage from "../pages/RepoSecurityPage";
import RepoSettingsPage from "../pages/RepoSettingsPage";
import RepoWikiPage from "../pages/RepoWikiPage";
import PullRequestComparePage from "../pulls/PullRequestComparePage";
import PullRequestList from "../pulls/PullRequestList";
import type { RepoContentKind } from "./utils/repoRouting";
import type { RepoTabKey } from "./utils/repoTabs";

type ExplorerLocation = {
  type: "root" | "file" | "dir";
  path?: string;
};

interface RepoWorkspaceContentProps {
  selectedRepo: Repository | null;
  currentUsername: string;
  selectedRepoVisibility: string;
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
  onOpenRepoDrawer: () => void;
  onSelectBranch: (branchName: string) => void;
  onSelectCommitBranch: (branchName: string) => void;
  onNavigateRepoLocation: (location: ExplorerLocation) => void;
  onBackToFiles: () => void;
  onNavigateRepoContent: (contentKind: "root" | "tree" | "blob", contentPath: string, branchName: string) => void;
  onOpenRepoCommits: (branchName: string, search?: string) => void;
  onOpenCreateFile: (branchName: string, directoryPath: string) => void;
  onOpenUploadFiles: (branchName: string, directoryPath: string) => void;
  onOpenRepoCompare: (baseRef?: string, headRef?: string) => void;
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
  onOpenRepoDrawer,
  onSelectBranch,
  onSelectCommitBranch,
  onNavigateRepoLocation,
  onBackToFiles,
  onNavigateRepoContent,
  onOpenRepoCommits,
  onOpenCreateFile,
  onOpenUploadFiles,
  onOpenRepoCompare,
}: RepoWorkspaceContentProps) {
  return (
    <div className={isFullBrowserMode ? "w-full min-h-full" : "max-w-[1400px] mx-auto px-4 py-6 h-full"}>
      {!selectedRepo ? (
        <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
          <div className="text-center space-y-3">
            <h2 className="text-xl font-medium">Select a repository to view its content</h2>
            <button
              type="button"
              onClick={onOpenRepoDrawer}
              className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)]"
            >
              Open Repository Menu
            </button>
          </div>
        </div>
      ) : (
        <div className={isFullBrowserMode ? "w-full min-h-full flex flex-col" : "w-full h-full min-h-0 flex flex-col gap-4"}>
          {!isFullBrowserMode ? (
            <div className="flex flex-wrap items-center justify-between gap-3">

            </div>
          ) : null}

          <div className={isFullBrowserMode ? "w-full flex-1 min-h-full" : "flex-1 min-h-0"}>
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
            {activeTab === "files" && routeContentKind === "new" && (
              <NewFilePage
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                branch={currentBranch || routeBranch || defaultBranchName}
                branches={branches}
                initialDirectoryPath={routeContentPath}
                onSelectBranch={onSelectBranch}
                onCancel={() => onNavigateRepoContent("tree", routeContentPath, currentBranch || routeBranch || defaultBranchName)}
                onCommitted={(createdFilePath: string) => onNavigateRepoContent("blob", createdFilePath, currentBranch || routeBranch || defaultBranchName)}
              />
            )}
            {activeTab === "files" && routeContentKind === "upload" && (
              <UploadFilesPage
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                branch={currentBranch || routeBranch || defaultBranchName}
                initialDirectoryPath={routeContentPath}
                onCancel={() => onNavigateRepoContent("tree", routeContentPath, currentBranch || routeBranch || defaultBranchName)}
                onCommitted={(targetDirectoryPath: string) => onNavigateRepoContent("tree", targetDirectoryPath, currentBranch || routeBranch || defaultBranchName)}
              />
            )}
            {activeTab === "files" && (routeContentKind === "tree" || routeContentKind === "blob") && (
              <RepoTreeBrowserPage
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                branch={currentBranch || routeBranch || defaultBranchName}
                branches={branches}
                initialLocation={explorerInitialLocation}
                onNavigateLocation={onNavigateRepoLocation}
                onSelectBranch={onSelectBranch}
                onOpenCommitHistory={(branchName) => onOpenRepoCommits(branchName, locationSearch)}
                onOpenCreateFile={onOpenCreateFile}
                onOpenUploadFiles={onOpenUploadFiles}
              />
            )}
            {activeTab === "files" && routeContentKind === "root" && (
              <FileExplorer
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                repoDescription={selectedRepo.description}
                repoOwner={selectedRepo.owner || currentUsername}
                repoStars={selectedRepo.stars}
                repoForks={selectedRepo.forks}
                repoWatchers={0}
                cloneUrl={selectedRepo.clone_url}
                branch={currentBranch}
                branches={branches}
                initialLocation={explorerInitialLocation}
                onNavigateLocation={onNavigateRepoLocation}
                onSelectBranch={onSelectBranch}
                onOpenCommitHistory={(branchName) => onOpenRepoCommits(branchName)}
                onOpenCreateFile={onOpenCreateFile}
                onOpenUploadFiles={onOpenUploadFiles}
              />
            )}
            {activeTab === "issues" && (
              <IssueBoard
                repoId={selectedRepo.id}
                repoName={selectedRepo.name}
                repoOwner={selectedRepo.owner || currentUsername}
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
              />
            )}
            {activeTab === "pulls" && routeContentKind !== "compare" && (
              <PullRequestList
                repoId={selectedRepo.id}
                currentUsername={currentUsername}
                onOpenCompare={() => onOpenRepoCompare(defaultBranchName, currentBranch || defaultBranchName)}
              />
            )}
            {activeTab === "agents" && <RepoAgentsPage />}
            {activeTab === "actions" && <RepoActionsPage />}
            {activeTab === "projects" && <RepoProjectsPage />}
            {activeTab === "wiki" && <RepoWikiPage repoName={selectedRepo.name} />}
            {activeTab === "security" && <RepoSecurityPage />}
            {activeTab === "insights" && <RepoInsights repoId={selectedRepo.id} />}
            {activeTab === "settings" && <RepoSettingsPage />}
          </div>
        </div>
      )}
    </div>
  );
}
