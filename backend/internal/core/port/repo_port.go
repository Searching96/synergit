package port

import (
	"io"
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type RepoRepository interface {
	Save(repo *domain.Repo) error
	FindAll() ([]*domain.Repo, error)
	FindByID(id string) (*domain.Repo, error)
}

type RepoUsecase interface {
	CreateRepository(name string, ownerID uuid.UUID) (*domain.Repo, error)
	GetIntoRefs(repoID string, service string) ([]byte, error)
	UploadPack(repoID string, in io.Reader, out io.Writer) error
	ReceivePack(repoID string, in io.Reader, out io.Writer) error
	GetAllRepositories() ([]*domain.Repo, error)
	GetRepoTree(repoID string, path string, branch string) ([]domain.RepoFile, error)
	GetRepoBlob(repoID string, path string, branch string) (string, error)
	GetRepoCommits(repoID string, branch string) ([]domain.Commit, error)
	GetRepoBranches(repoID string) ([]domain.Branch, error)
}
