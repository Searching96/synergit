package port

import (
	"io"
	"synergit/internal/core/domain"
)

type GitManager interface {
	// Init a bare repo at a relative storage slug (for example: username/repo)
	InitBareRepo(repoSlug string) (string, error)

	// Methods for smart http
	AdvertiseRefs(repoPath string, service string) ([]byte, error)

	// Method for pulling code
	UploadPack(repoPath string, reqBody io.Reader, resWriter io.Writer) error

	// Method for pushing code
	ReceivePack(repoPath string, reqBody io.Reader, resWriter io.Writer) error

	// Method for file tree view, path can be empty for the root directory,
	// this returns file paths
	GetTree(repoPath string, path string, branch string) ([]domain.RepoFile, error)

	// Method for getting file content
	GetBlob(repoPath string, path string, branch string) (string, error)

	// Method for getting all commits
	GetCommits(repoPath string, branch string) ([]domain.Commit, error)

	GetBranches(repoPath string) ([]domain.Branch, error)
	CreateBranch(repoPath string, newBranch string,
		fromBranch string) (*domain.Branch, error)
	MergeBranches(repoPath string, sourceBranch string, targetBranch string,
		mergerName string, commitMessage string) error

	// Returns a list of file paths that have merge conflicts
	GetConflictingFiles(repoName string, sourceBranch string,
		targetBranch string) ([]string, error)

	// Returns the raw file content with Git's conflict markers inserted
	GetConflictContent(repoName string, sourceBranch string,
		targetBranch string, filePath string) (string, error)

	// Takes the resolved contents, commits them to the source branch, and pushes
	ResolveConflictsAndCommit(repoName string, sourceBranch string,
		targetBranch string, resolverName string, commitMessage string,
		resolutions []domain.ConflictResolution) error
}
