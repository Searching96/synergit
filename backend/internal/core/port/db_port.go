package port

import "synergit/internal/core/domain"

type RepositoryStore interface {
	Save(repo *domain.Repo) error
	FindAll() ([]*domain.Repo, error)
}
