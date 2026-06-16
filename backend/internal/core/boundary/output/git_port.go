package output

import (
	"synergit/internal/core/domain"
)

type GitManager interface {
	// Init a bare repo at a relative storage slug (for example: username/repo)
	InitBareRepo(repoSlug string) (string, error)
	DeleteRepository(repoPath string) error
	RenameRepository(repoPath string, newName string) (string, error)
	RenameUserStorage(oldUsername, newUsername string) error
	BootstrapRepository(repoPath string, branch string, authorName string, authorEmail string,
		files map[string]string, commitMessage string) error
	CloneBareRepo(sourcePath string, targetPath string, branch string) (string, error)

	// Methods for smart http
	AdvertiseRefs(repoPath string, service string) ([]byte, error)

	// Method for pulling code
	UploadPack(repoPath string, requestPayload ByteReader,
		responseWriter ByteWriter) error

	// Method for pushing code
	ReceivePack(repoPath string, requestPayload ByteReader,
		responseWriter ByteWriter) error

	// Method for file tree view, path can be empty for the root directory,
	// this returns file paths
	GetTree(repoPath string, path string, branch string) ([]domain.RepoFile, error)

	// Method for getting file content
	GetBlob(repoPath string, path string, branch string) (string, error)

	// Method for getting commits, optionally filtered by path, with pagination.
	GetCommits(repoPath string, branch string, path string, limit int, offset int) (domain.CommitPage, error)
	GetCommitStats(repoPath string, branch string, pathFilter string) (domain.CommitStats, error)
	GetCommitsBatch(repoPath string, branch string, paths []string) (map[string]*domain.Commit, error)
	GetCommitDetail(repoPath string, commitHash string) (*domain.Commit, error)
	GetCommitDiff(repoPath string, commitHash string) ([]domain.DiffFile, error)
	GetLanguageBreakdown(repoPath string, preferredBranch string) (string, []domain.LanguageStat, error)

	GetBranches(repoPath string) ([]domain.Branch, error)
	CreateBranch(repoPath string, newBranch string,
		fromBranch string) (*domain.Branch, error)
	RenameBranch(repoPath string, oldBranch string,
		newBranch string) (*domain.Branch, error)
	DeleteBranch(repoPath string, branchName string) error
	CommitFileChange(repoPath string, branch string, filePath string, oldFilePath string,
		content string, authorName string, authorEmail string, commitMessage string) error
	CommitFilesChange(repoPath string, branch string, files map[string]string,
		authorName string, authorEmail string, commitMessage string) error
	DeletePath(repoPath string, branch string, path string, authorName string, authorEmail string, commitMessage string) error
	CompareRefs(repoPath string, baseRef string,
		headRef string) (*domain.PullRequestCompareResult, error)
	MergeBranches(repoPath string, sourceBranch string, targetBranch string,
		mergerName string, mergerEmail string, commitMessage string) error
	CreateRevertBranch(repoPath string, targetBranch string, revertBranch string,
		mergeCommitHash string, authorName string, authorEmail string, commitMessage string) error

	// Returns a list of file paths that have merge conflicts
	GetConflictingFiles(repoName string, sourceBranch string,
		targetBranch string) ([]string, error)

	// Returns the raw file content with Git's conflict markers inserted
	GetConflictContent(repoName string, sourceBranch string,
		targetBranch string, filePath string) (string, error)

	// Takes the resolved contents, commits them to the source branch, and pushes
	ResolveConflictsAndCommit(repoName string, sourceBranch string,
		targetBranch string, resolverName string, resolverEmail string, commitMessage string,
		resolutions []domain.ConflictResolution) error
}
