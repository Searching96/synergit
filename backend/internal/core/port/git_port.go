package port

import "io"

type GitManager interface {
	// Init a bare repo, which is the repo type the server must use for git repo
	InitBareRepo(repoName string) (string, error)

	// Methods for smart http
	AdvertiseRefs(repoName string, service string) ([]byte, error)
	UploadPack(repoName string, reqBody io.Reader, resWriter io.Writer) error
}
