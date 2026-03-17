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

	// Method for file tree view, path can be empty for the root directory
	GetTree(repoName string, path string) ([]domain.RepoFile, error)
}
