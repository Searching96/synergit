package usecase

import (
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/google/uuid"
)

type CollaboratorService struct {
	collaboratorStore port.CollaboratorRepository
}

func NewCollaboratorService(collaboratorStore port.CollaboratorRepository) *CollaboratorService {
	return &CollaboratorService{
		collaboratorStore: collaboratorStore,
	}
}

func (s *CollaboratorService) AddCollaborator(repoID uuid.UUID, userID uuid.UUID,
	role domain.CollaboratorRole, requesterID uuid.UUID) error {
	normalizedRole, err := domain.ParseCollaboratorRole(string(role))
	if err != nil {
		return err
	}

	requesterRole, err := s.collaboratorStore.GetRole(repoID, requesterID)
	if err != nil {
		return errors.New("failed to verify requester permissions")
	}

	if !requesterRole.CanManageCollaborators() {
		return errors.New("unauthorized: only owners and maintainers can add collaborators")
	}

	return s.collaboratorStore.AddCollaborator(repoID, userID, normalizedRole)
}

func (s *CollaboratorService) RemoveCollaborator(repoID uuid.UUID, userID uuid.UUID, requesterID uuid.UUID) error {
	if requesterID != userID {
		requesterRole, err := s.collaboratorStore.GetRole(repoID, requesterID)
		if err != nil {
			return errors.New("failed to verify requester permissions")
		}

		if !requesterRole.CanManageCollaborators() {
			return errors.New("unauthorized: only owners and maintainers can remove other collaborators")
		}
	}

	return s.collaboratorStore.RemoveCollaborator(repoID, userID)
}

func (s *CollaboratorService) GetCollaborators(repoID uuid.UUID, requesterID uuid.UUID) ([]domain.RepoCollaborator, error) {
	requesterRole, err := s.collaboratorStore.GetRole(repoID, requesterID)
	if err != nil || !requesterRole.IsValid() {
		return nil, errors.New("unauthorized: you do not have access to this repo")
	}

	return s.collaboratorStore.GetCollaborators(repoID)
}
