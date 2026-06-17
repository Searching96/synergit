package usecase

import (
	"time"

	"synergit/internal/core/boundary/output"
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

var _ output.RepoEventUseCase = (*RepoEventService)(nil)

type RepoEventService struct {
	repoEventStore output.RepoEventRepository
}

func NewRepoEventService(repoEventStore output.RepoEventRepository) *RepoEventService {
	return &RepoEventService{repoEventStore: repoEventStore}
}

func (s *RepoEventService) GetRepoEvents(repoID uuid.UUID, eventType *domain.EventType, page, pageSize int) ([]domain.RepoEvent, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	if eventType != nil && *eventType != "" {
		return s.repoEventStore.ListFilteredByRepoID(repoID, *eventType, pageSize, offset)
	}

	return s.repoEventStore.ListByRepoID(repoID, pageSize, offset)
}

func (s *RepoEventService) LogEvent(repoID, actorID uuid.UUID, eventType domain.EventType, payload string) error {
	event := &domain.RepoEvent{
		ID:        uuid.New(),
		RepoID:    repoID,
		ActorID:   actorID,
		EventType: eventType,
		Payload:   payload,
		CreatedAt: time.Now(),
	}
	return s.repoEventStore.Create(event)
}
