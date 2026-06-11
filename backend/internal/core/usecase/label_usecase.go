package usecase

import (
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/boundary/output"

	"github.com/google/uuid"
)

var _ output.LabelUseCase = (*LabelService)(nil)

type LabelService struct {
	labelStore  output.LabelRepository
	issueStore  output.IssueRepository
	collabStore output.CollaboratorRepository
}

func NewLabelService(labelStore output.LabelRepository, issueStore output.IssueRepository,
	collabStore output.CollaboratorRepository) *LabelService {

	return &LabelService{
		labelStore:  labelStore,
		issueStore:  issueStore,
		collabStore: collabStore,
	}
}

func (s *LabelService) ListLabels(repoID uuid.UUID,
	requesterID uuid.UUID) ([]domain.Label, error) {

	if _, err := s.requireRepoAccess(repoID, requesterID); err != nil {
		return nil, err
	}

	labels, err := s.labelStore.ListByRepo(repoID)
	if err != nil {
		return nil, err
	}

	if len(labels) == 0 {
		for _, def := range domain.DefaultLabels() {
			def.ID = uuid.New()
			def.RepoID = repoID
			if err := s.labelStore.Create(&def); err != nil {
				return nil, err
			}
		}

		return s.labelStore.ListByRepo(repoID)
	}

	return labels, nil
}

func (s *LabelService) ListIssueLabels(repoID uuid.UUID, issueID uuid.UUID,
	requesterID uuid.UUID) ([]domain.Label, error) {

	if _, err := s.getIssueWithAccess(repoID, issueID, requesterID); err != nil {
		return nil, err
	}

	return s.labelStore.ListForIssue(issueID)
}

func (s *LabelService) AddLabelToIssue(repoID uuid.UUID, issueID uuid.UUID,
	labelID uuid.UUID, requesterID uuid.UUID) error {

	if err := s.requireIssueWrite(repoID, issueID, requesterID); err != nil {
		return err
	}

	return s.labelStore.AddToIssue(issueID, labelID)
}

func (s *LabelService) RemoveLabelFromIssue(repoID uuid.UUID, issueID uuid.UUID,
	labelID uuid.UUID, requesterID uuid.UUID) error {

	if err := s.requireIssueWrite(repoID, issueID, requesterID); err != nil {
		return err
	}

	return s.labelStore.RemoveFromIssue(issueID, labelID)
}

func (s *LabelService) requireIssueWrite(repoID uuid.UUID, issueID uuid.UUID,
	requesterID uuid.UUID) error {

	issue, err := s.getIssueWithAccess(repoID, issueID, requesterID)
	if err != nil {
		return err
	}

	role, err := s.collabStore.GetRole(issue.RepoID, requesterID)
	if err != nil || !role.CanWrite() {
		return errors.New("unauthorized: you do not have permission to label this issue")
	}

	return nil
}

func (s *LabelService) getIssueWithAccess(repoID uuid.UUID, issueID uuid.UUID,
	requesterID uuid.UUID) (*domain.Issue, error) {

	issue, err := s.issueStore.GetByID(issueID)
	if err != nil {
		return nil, err
	}

	if issue == nil || issue.RepoID != repoID {
		return nil, errors.New("issue not found")
	}

	if _, err := s.requireRepoAccess(issue.RepoID, requesterID); err != nil {
		return nil, err
	}

	return issue, nil
}

func (s *LabelService) requireRepoAccess(repoID uuid.UUID,
	requesterID uuid.UUID) (domain.CollaboratorRole, error) {

	role, err := s.collabStore.GetRole(repoID, requesterID)
	if err != nil || !role.IsValid() {
		return "", errors.New("unauthorized: you do not have access to this repo")
	}

	return role, nil
}
