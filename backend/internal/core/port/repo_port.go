package port

import "synergit/internal/core/domain"

type RepoRepository interface {
	Save(repo *domain.Repo) error
	FindAll() ([]*domain.Repo, error)
	FindByID(id string) (*domain.Repo, error)
}
