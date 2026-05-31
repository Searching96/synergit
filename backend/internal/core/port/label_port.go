package port

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type LabelRepository interface {
	Create(label *domain.Label) error
	ListByRepo(repoID uuid.UUID) ([]domain.Label, error)
	AddToIssue(issueID uuid.UUID, labelID uuid.UUID) error
	RemoveFromIssue(issueID uuid.UUID, labelID uuid.UUID) error
	ListForIssue(issueID uuid.UUID) ([]domain.Label, error)
}

type LabelUseCase interface {
	ListLabels(repoID uuid.UUID, requesterID uuid.UUID) ([]domain.Label, error)
	ListIssueLabels(repoID uuid.UUID, issueID uuid.UUID, requesterID uuid.UUID) ([]domain.Label, error)
	AddLabelToIssue(repoID uuid.UUID, issueID uuid.UUID, labelID uuid.UUID, requesterID uuid.UUID) error
	RemoveLabelFromIssue(repoID uuid.UUID, issueID uuid.UUID, labelID uuid.UUID, requesterID uuid.UUID) error
}
