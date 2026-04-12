package port

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type RepoRepository interface {
	Save(repo *domain.Repo) error
	FindAll() ([]*domain.Repo, error)
	FindByID(id uuid.UUID) (*domain.Repo, error)
	FindByOwnerAndName(ownerUsername string, repoName string) (*domain.Repo, error)
	UpdatePrimaryLanguage(id uuid.UUID, primaryLanguage string) error
}

type RepoUsecase interface {
	CreateRepository(name string, ownerID uuid.UUID) (*domain.Repo, error)
	CreateRepositoryWithOptions(name string, ownerID uuid.UUID, options domain.CreateRepositoryOptions) (*domain.Repo, error)
	// Deprecated: use GetIntoRefsByOwnerAndName for username/repo clone flow.
	GetIntoRefs(repoID uuid.UUID, service string) ([]byte, error)
	GetIntoRefsByOwnerAndName(ownerUsername string, repoName string, service string) ([]byte, error)
	// Deprecated: use UploadPackByOwnerAndName for username/repo clone flow.
	UploadPack(repoID uuid.UUID, requestPayload ByteReader,
		responseWriter ByteWriter) error
	UploadPackByOwnerAndName(ownerUsername string, repoName string,
		requestPayload ByteReader, responseWriter ByteWriter) error
	// Deprecated: repo_id smart HTTP path is legacy and not exposed publicly.
	ReceivePack(repoID uuid.UUID, requestPayload ByteReader,
		responseWriter ByteWriter) error
	ReceivePackByOwnerAndName(ownerUsername string, repoName string,
		requestPayload ByteReader, responseWriter ByteWriter) error
	GetAllRepositories() ([]*domain.Repo, error)
	GetRepoTree(repoID uuid.UUID, path string, branch string) ([]domain.RepoFile, error)
	GetRepoBlob(repoID uuid.UUID, path string, branch string) (string, error)
	GetRepoCommits(repoID uuid.UUID, branch string) ([]domain.Commit, error)
	GetRepoBranches(repoID uuid.UUID) ([]domain.Branch, error)
	CreateRepoBranch(repoID uuid.UUID, newBranch string, fromBranch string) (*domain.Branch, error)
	CommitFileChange(repoID uuid.UUID, requesterID uuid.UUID, branch string,
		filePath string, content string, commitMessage string) error
}
