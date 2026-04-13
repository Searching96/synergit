package usecase

import (
	"errors"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"

	"github.com/google/uuid"
)

var _ port.IssueUseCase = (*IssueService)(nil)

type IssueService struct {
	issueStore  port.IssueRepository
	collabStore port.CollaboratorRepository
}

func NewIssueService(issueStore port.IssueRepository,
	collabStore port.CollaboratorRepository) *IssueService {

	return &IssueService{
		issueStore:  issueStore,
		collabStore: collabStore,
	}
}

func (s *IssueService) CreateIssue(repoID uuid.UUID, creatorID uuid.UUID,
	title string, description string) (*domain.Issue, error) {

	if err := domain.ValidateCreateIssueInput(title); err != nil {
		return nil, err
	}

	if _, err := s.requireRepoAccess(repoID, creatorID); err != nil {
		return nil, err
	}

	now := time.Now()
	issue := &domain.Issue{
		ID:          uuid.New(),
		RepoID:      repoID,
		CreatorID:   creatorID,
		Title:       strings.TrimSpace(title),
		Description: strings.TrimSpace(description),
		Status:      domain.IssueStatusOpen,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.issueStore.Create(issue); err != nil {
		return nil, err
	}

	return issue, nil
}

func (s *IssueService) ListIssuesForRepo(repoID uuid.UUID,
	requesterID uuid.UUID) ([]domain.Issue, error) {

	if _, err := s.requireRepoAccess(repoID, requesterID); err != nil {
		return nil, err
	}

	return s.issueStore.ListByRepo(repoID)
}

func (s *IssueService) GetIssue(repoID uuid.UUID, issueID uuid.UUID,
	requesterID uuid.UUID) (*domain.Issue, error) {

	issue, err := s.getIssueForRepo(repoID, issueID)
	if err != nil {
		return nil, err
	}

	if _, err := s.requireRepoAccess(issue.RepoID, requesterID); err != nil {
		return nil, err
	}

	assignees, err := s.issueStore.ListAssignees(issue.ID)
	if err != nil {
		return nil, err
	}
	issue.Assignees = assignees

	return issue, nil
}

func (s *IssueService) TransitionIssueStatus(repoID uuid.UUID, issueID uuid.UUID,
	requesterID uuid.UUID, nextStatus string) error {

	issue, err := s.getIssueForRepo(repoID, issueID)
	if err != nil {
		return err
	}

	requesterRole, err := s.requireRepoAccess(issue.RepoID, requesterID)
	if err != nil {
		return err
	}

	if issue.CreatorID != requesterID && !requesterRole.CanWrite() {
		return errors.New("unauthorized: you do not have permission to change issue status")
	}

	parsedStatus, err := domain.ParseIssueStatus(nextStatus)
	if err != nil {
		return err
	}

	if err := domain.ValidateIssueStatusTransition(issue.Status, parsedStatus); err != nil {
		return err
	}

	return s.issueStore.UpdateStatus(issue.ID, parsedStatus)
}

func (s *IssueService) AssignIssue(repoID uuid.UUID, issueID uuid.UUID,
	assigneeID uuid.UUID, requesterID uuid.UUID) error {

	issue, err := s.getIssueForRepo(repoID, issueID)
	if err != nil {
		return err
	}

	requesterRole, err := s.requireRepoAccess(issue.RepoID, requesterID)
	if err != nil {
		return err
	}

	if !requesterRole.CanWrite() {
		return errors.New("unauthorized: you do not have permission to assign this issue")
	}

	assigneeRole, err := s.collabStore.GetRole(issue.RepoID, assigneeID)
	if err != nil {
		return errors.New("failed to verify assignee permissions")
	}

	if !assigneeRole.IsValid() {
		return errors.New("assignee must be a repository collaborator")
	}

	return s.issueStore.AddAssignee(issue.ID, assigneeID)
}

func (s *IssueService) UnassignIssue(repoID uuid.UUID, issueID uuid.UUID,
	assigneeID uuid.UUID, requesterID uuid.UUID) error {

	issue, err := s.getIssueForRepo(repoID, issueID)
	if err != nil {
		return err
	}

	requesterRole, err := s.requireRepoAccess(issue.RepoID, requesterID)
	if err != nil {
		return err
	}

	if !requesterRole.CanWrite() {
		return errors.New("unauthorized: you do not have permission to unassign this issue")
	}

	return s.issueStore.RemoveAssignee(issue.ID, assigneeID)
}

func (s *IssueService) ListIssueAssignees(repoID uuid.UUID, issueID uuid.UUID,
	requesterID uuid.UUID) ([]domain.IssueAssignee, error) {

	issue, err := s.getIssueForRepo(repoID, issueID)
	if err != nil {
		return nil, err
	}

	if _, err := s.requireRepoAccess(issue.RepoID, requesterID); err != nil {
		return nil, err
	}

	return s.issueStore.ListAssignees(issue.ID)
}

func (s *IssueService) requireRepoAccess(repoID uuid.UUID,
	requesterID uuid.UUID) (domain.CollaboratorRole, error) {

	role, err := s.collabStore.GetRole(repoID, requesterID)
	if err != nil || !role.IsValid() {
		return "", errors.New("unauthorized: you do not have access to this repo")
	}

	return role, nil
}

func (s *IssueService) getIssueForRepo(repoID uuid.UUID,
	issueID uuid.UUID) (*domain.Issue, error) {

	issue, err := s.issueStore.GetByID(issueID)
	if err != nil {
		return nil, err
	}

	if issue == nil {
		return nil, errors.New("issue not found")
	}

	if issue.RepoID != repoID {
		return nil, errors.New("issue not found in repository")
	}

	return issue, nil
}
