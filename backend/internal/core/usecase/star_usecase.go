package usecase

import (
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/google/uuid"
)

var _ port.StarUseCase = (*StarService)(nil)

type StarService struct {
	starStore port.StarRepository
}

func NewStarService(starStore port.StarRepository) *StarService {
	return &StarService{starStore: starStore}
}

func (s *StarService) Star(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error) {
	if err := s.starStore.Star(requesterID, repoID); err != nil {
		return false, 0, err
	}
	return s.GetStatus(repoID, requesterID)
}

func (s *StarService) Unstar(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error) {
	if err := s.starStore.Unstar(requesterID, repoID); err != nil {
		return false, 0, err
	}
	return s.GetStatus(repoID, requesterID)
}

func (s *StarService) GetStatus(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error) {
	starred, err := s.starStore.IsStarred(requesterID, repoID)
	if err != nil {
		return false, 0, err
	}
	count, err := s.starStore.CountForRepo(repoID)
	if err != nil {
		return false, 0, err
	}
	return starred, count, nil
}

func (s *StarService) ListStarred(requesterID uuid.UUID) ([]*domain.Repo, error) {
	return s.starStore.ListStarredByUser(requesterID)
}
