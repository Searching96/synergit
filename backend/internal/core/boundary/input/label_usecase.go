package input

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type LabelUseCase interface {
	ListLabels(repoID uuid.UUID,
		requesterID uuid.UUID) ([]domain.Label, error)
	ListIssueLabels(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) ([]domain.Label, error)
	AddLabelToIssue(repoID uuid.UUID, issueID uuid.UUID,
		labelID uuid.UUID, requesterID uuid.UUID) error
	RemoveLabelFromIssue(repoID uuid.UUID, issueID uuid.UUID,
		labelID uuid.UUID, requesterID uuid.UUID) error
}
