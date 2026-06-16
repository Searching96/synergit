package usecase

import (
	"synergit/internal/core/boundary/output"

	"github.com/google/uuid"
)

var _ output.WatcherUseCase = (*WatcherService)(nil)

type WatcherService struct {
	watcherStore output.WatcherRepository
}

func NewWatcherService(watcherStore output.WatcherRepository) *WatcherService {
	return &WatcherService{watcherStore: watcherStore}
}

func (s *WatcherService) Watch(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error) {
	if err := s.watcherStore.Watch(requesterID, repoID); err != nil {
		return false, 0, err
	}
	return s.GetStatus(repoID, requesterID)
}

func (s *WatcherService) Unwatch(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error) {
	if err := s.watcherStore.Unwatch(requesterID, repoID); err != nil {
		return false, 0, err
	}
	return s.GetStatus(repoID, requesterID)
}

func (s *WatcherService) GetStatus(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error) {
	watched, err := s.watcherStore.IsWatched(requesterID, repoID)
	if err != nil {
		return false, 0, err
	}
	count, err := s.watcherStore.CountForRepo(repoID)
	if err != nil {
		return false, 0, err
	}
	return watched, count, nil
}
