package output

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type RepoEventRepository interface {
	Create(event *domain.RepoEvent) error
	ListByRepoID(repoID uuid.UUID, limit, offset int) ([]domain.RepoEvent, error)
	ListFilteredByRepoID(repoID uuid.UUID, eventType domain.EventType, limit, offset int) ([]domain.RepoEvent, error)
}

type RepoEventUseCase interface {
	GetRepoEvents(repoID uuid.UUID, eventType *domain.EventType, page, pageSize int) ([]domain.RepoEvent, error)
	LogEvent(repoID, actorID uuid.UUID, eventType domain.EventType, payload string) error
}
