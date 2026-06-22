package usecase

import (
	"encoding/json"
	"errors"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/boundary/output"
	"time"

	"github.com/google/uuid"
)

var _ output.IssueUseCase = (*IssueService)(nil)

type IssueService struct {
	issueStore  output.IssueRepository
	collabStore output.CollaboratorRepository
	prStore     output.PullRequestRepository
}

func NewIssueService(issueStore output.IssueRepository,
	collabStore output.CollaboratorRepository,
	prStore output.PullRequestRepository) *IssueService {

	return &IssueService{
		issueStore:  issueStore,
		collabStore: collabStore,
		prStore:     prStore,
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

	_ = s.issueStore.AddEvent(issue.ID, creatorID, "opened")

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
	requesterID uuid.UUID, nextStatus string, closeReason string) error {

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

	var parsedCloseReason domain.IssueCloseReason
	if parsedStatus == domain.IssueStatusClosed {
		if strings.TrimSpace(closeReason) == "" {
			parsedCloseReason = domain.IssueCloseReasonCompleted
		} else {
			parsedCloseReason, err = domain.ParseIssueCloseReason(closeReason)
			if err != nil {
				return err
			}
		}
	}

	if parsedStatus == issue.Status {
		if parsedStatus != domain.IssueStatusClosed || parsedCloseReason == issue.CloseReason {
			return errors.New("issue is already in the requested status")
		}
	} else if err := domain.ValidateIssueStatusTransition(issue.Status, parsedStatus); err != nil {
		return err
	}

	if err := s.issueStore.UpdateStatus(issue.ID, parsedStatus, parsedCloseReason); err != nil {
		return err
	}

	eventType := "reopened"
	if parsedStatus == domain.IssueStatusClosed {
		switch parsedCloseReason {
		case domain.IssueCloseReasonNotPlanned:
			eventType = "closed_not_planned"
		case domain.IssueCloseReasonDuplicate:
			eventType = "closed_duplicate"
		default:
			eventType = "closed_completed"
		}
	}
	_ = s.issueStore.AddEvent(issue.ID, requesterID, eventType)

	return nil
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

func (s *IssueService) ListIssueEvents(repoID uuid.UUID, issueID uuid.UUID,
	requesterID uuid.UUID) ([]domain.IssueEvent, error) {

	issue, err := s.getIssueForRepo(repoID, issueID)
	if err != nil {
		return nil, err
	}

	if _, err := s.requireRepoAccess(issue.RepoID, requesterID); err != nil {
		return nil, err
	}

	events, err := s.issueStore.ListEvents(issue.ID)
	if err != nil {
		return nil, err
	}

	for i := range events {
		if events[i].EventType == "pr_linked" || events[i].EventType == "pr_unlinked" {
			var payloadData map[string]string
			if err := json.Unmarshal(events[i].Payload, &payloadData); err == nil {
				if prIDStr, ok := payloadData["pull_request_id"]; ok {
					if prID, err := uuid.Parse(prIDStr); err == nil {
						if pr, err := s.prStore.GetByID(prID); err == nil && pr != nil {
							events[i].PullRequest = pr
							if prNum, err := s.prStore.GetSequenceNumber(pr.RepoID, pr.ID); err == nil {
								events[i].PullRequestNumber = prNum
							}
						}
					}
				}
			}
		}
	}

	return events, nil
}

func (s *IssueService) ListIssueComments(repoID uuid.UUID, issueID uuid.UUID,
	requesterID uuid.UUID) ([]domain.IssueComment, error) {

	issue, err := s.getIssueForRepo(repoID, issueID)
	if err != nil {
		return nil, err
	}

	if _, err := s.requireRepoAccess(issue.RepoID, requesterID); err != nil {
		return nil, err
	}

	return s.issueStore.ListComments(issue.ID)
}

func (s *IssueService) CreateIssueComment(repoID uuid.UUID, issueID uuid.UUID,
	authorID uuid.UUID, body string) (*domain.IssueComment, error) {

	if strings.TrimSpace(body) == "" {
		return nil, errors.New("comment body is required")
	}

	issue, err := s.getIssueForRepo(repoID, issueID)
	if err != nil {
		return nil, err
	}

	if _, err := s.requireRepoAccess(issue.RepoID, authorID); err != nil {
		return nil, err
	}

	comment := &domain.IssueComment{
		ID:        uuid.New(),
		IssueID:   issue.ID,
		AuthorID:  authorID,
		Body:      strings.TrimSpace(body),
		CreatedAt: time.Now(),
	}

	if err := s.issueStore.AddComment(comment); err != nil {
		return nil, err
	}

	return comment, nil
}

func (s *IssueService) LinkBranchToIssue(repoID uuid.UUID, issueID uuid.UUID, branchName string, requesterID uuid.UUID) error {
	if _, err := s.requireRepoAccess(repoID, requesterID); err != nil {
		return err
	}

	issue, err := s.issueStore.GetByID(issueID)
	if err != nil {
		return err
	}
	if issue == nil || issue.RepoID != repoID {
		return errors.New("issue not found")
	}

	return s.issueStore.LinkBranch(issueID, branchName)
}

func (s *IssueService) UnlinkBranchFromIssue(repoID uuid.UUID, issueID uuid.UUID, branchName string, requesterID uuid.UUID) error {
	if _, err := s.requireRepoAccess(repoID, requesterID); err != nil {
		return err
	}

	issue, err := s.issueStore.GetByID(issueID)
	if err != nil {
		return err
	}
	if issue == nil || issue.RepoID != repoID {
		return errors.New("issue not found")
	}

	return s.issueStore.UnlinkBranch(issueID, branchName)
}

func (s *IssueService) ListLinkedBranchesForIssue(repoID uuid.UUID, issueID uuid.UUID, requesterID uuid.UUID) ([]string, error) {
	if _, err := s.requireRepoAccess(repoID, requesterID); err != nil {
		return nil, err
	}

	issue, err := s.issueStore.GetByID(issueID)
	if err != nil {
		return nil, err
	}
	if issue == nil || issue.RepoID != repoID {
		return nil, errors.New("issue not found")
	}

	return s.issueStore.ListLinkedBranches(issueID)
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
