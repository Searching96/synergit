package port

import (
	"io"
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type RepoRepository interface {
	Save(repo *domain.Repo) error
	FindAll() ([]*domain.Repo, error)
	FindByID(id uuid.UUID) (*domain.Repo, error)
}

type RepoUsecase interface {
	CreateRepository(name string, ownerID uuid.UUID) (*domain.Repo, error)
	GetIntoRefs(repoID uuid.UUID, service string) ([]byte, error)
	UploadPack(repoID uuid.UUID, in io.Reader, out io.Writer) error
	ReceivePack(repoID uuid.UUID, in io.Reader, out io.Writer) error
	GetAllRepositories() ([]*domain.Repo, error)
	GetRepoTree(repoID uuid.UUID, path string, branch string) ([]domain.RepoFile, error)
	GetRepoBlob(repoID uuid.UUID, path string, branch string) (string, error)
	GetRepoCommits(repoID uuid.UUID, branch string) ([]domain.Commit, error)
	GetRepoBranches(repoID uuid.UUID) ([]domain.Branch, error)
}
