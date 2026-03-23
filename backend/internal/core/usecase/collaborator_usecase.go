package usecase

import (
	"errors"
	"strings"
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

func (s *CollaboratorService) AddCollaborator(repoID uuid.UUID, userID uuid.UUID, role string, requesterID uuid.UUID) error {
	role = strings.ToUpper(role)

	validRoles := map[string]bool{"OWNER": true, "MAINTAINER": true, "WRITE": true, "READ": true}
	if !validRoles[role] {
		return errors.New("invalid role: must be OWNER, MAINTAINER, WRITE, or READ")
	}

	requesterRole, err := s.collaboratorStore.GetRole(repoID, requesterID)
	if err != nil {
		return errors.New("failed to verify requester permissions")
	}

	if requesterRole != "OWNER" && requesterRole != "MAINTAINER" {
		return errors.New("unauthorized: only owners and maintainers can add collaborators")
	}

	return s.collaboratorStore.AddCollaborator(repoID, userID, role)
}

func (s *CollaboratorService) RemoveCollaborator(repoID uuid.UUID, userID uuid.UUID, requesterID uuid.UUID) error {
	if requesterID != userID {
		requesterRole, err := s.collaboratorStore.GetRole(repoID, requesterID)
		if err != nil {
			return errors.New("failed to verify requester permissions")
		}

		if requesterRole != "OWNER" && requesterRole != "MAINTAINER" {
			return errors.New("unauthorized: only owners and maintainers can remove other collaborators")
		}
	}

	return s.collaboratorStore.RemoveCollaborator(repoID, userID)
}

func (s *CollaboratorService) GetCollaborators(repoID uuid.UUID, requesterID uuid.UUID) ([]domain.RepoCollaborator, error) {
	requesterRole, err := s.collaboratorStore.GetRole(repoID, requesterID)
	if err != nil || requesterRole == "" {
		return nil, errors.New("unauthorized: you do not have access to this repo")
	}

	return s.collaboratorStore.GetCollaborators(repoID)
}
