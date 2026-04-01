package domain

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type CollaboratorRole string

const (
	CollaboratorRoleOwner      CollaboratorRole = "OWNER"
	CollaboratorRoleMaintainer CollaboratorRole = "MAINTAINER"
	CollaboratorRoleWrite      CollaboratorRole = "WRITE"
)

func ParseCollaboratorRole(rawRole string) (CollaboratorRole, error) {
	role := CollaboratorRole(strings.ToUpper(strings.TrimSpace(rawRole)))
	if !role.IsValid() {
		return "", errors.New("invalid role: must be OWNER, MAINTAINER, or WRITE")
	}

	return role, nil
}

func (r CollaboratorRole) IsValid() bool {
	switch r {
	case CollaboratorRoleOwner, CollaboratorRoleMaintainer, CollaboratorRoleWrite:
		return true
	default:
		return false
	}
}

func (r CollaboratorRole) CanManageCollaborators() bool {
	return r == CollaboratorRoleOwner || r == CollaboratorRoleMaintainer
}

func (r CollaboratorRole) CanWrite() bool {
	return r == CollaboratorRoleOwner || r == CollaboratorRoleMaintainer ||
		r == CollaboratorRoleWrite
}

type RepoCollaborator struct {
	RepositoryID uuid.UUID        `json:"repository_id"`
	UserID       uuid.UUID        `json:"user_id"`
	Role         CollaboratorRole `json:"role"`
	CreatedAt    time.Time        `json:"created_at"`
}
