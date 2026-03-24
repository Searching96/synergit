package port

import (
	"io"
	"synergit/internal/core/domain"
)

type GitManager interface {
	// Init a bare repo, which is the repo type the server must use for git repo
	InitBareRepo(repoName string) (string, error)

	// Methods for smart http
	AdvertiseRefs(repoName string, service string) ([]byte, error)

	// Method for pulling code
	UploadPack(repoName string, reqBody io.Reader, resWriter io.Writer) error

	// Method for pushing code
	ReceivePack(repoName string, reqBody io.Reader, resWriter io.Writer) error

	// Method for file tree view, path can be empty for the root directory, this returns file paths
	GetTree(repoName string, path string, branch string) ([]domain.RepoFile, error)

	// Method for getting file content
	GetBlob(repoName string, path string, branch string) (string, error)

	// Method for getting all commits
	GetCommits(repoName string, branch string) ([]domain.Commit, error)

	GetBranches(repoName string) ([]domain.Branch, error)
	MergeBranches(repoName string, sourceBranch string, targetBranch string,
		mergerName string, commitMessage string) error
}
