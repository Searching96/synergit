package http

import (
	"net/http"
	"synergit/internal/adapter/controller/dto"
	"synergit/internal/core/boundary/input"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type IssueHandler struct {
	issueUseCase input.IssueUseCase
}

func NewIssueHandler(uc input.IssueUseCase) *IssueHandler {
	return &IssueHandler{issueUseCase: uc}
}

func parseIssueID(c *gin.Context) (uuid.UUID, bool) {
	issueID, err := uuid.Parse(c.Param("issue_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid issue_id format"})
		return uuid.Nil, false
	}

	return issueID, true
}

func (h *IssueHandler) HandleCreateIssue(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req dto.CreateIssueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	issue, err := h.issueUseCase.CreateIssue(repoID, requesterID,
		req.Title, req.Description)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, issue)
}

func (h *IssueHandler) HandleListIssues(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	issues, err := h.issueUseCase.ListIssuesForRepo(repoID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, issues)
}

func (h *IssueHandler) HandleGetIssue(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	issue, err := h.issueUseCase.GetIssue(repoID, issueID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, issue)
}

func (h *IssueHandler) HandleUpdateIssueStatus(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req dto.UpdateIssueStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.issueUseCase.TransitionIssueStatus(repoID, issueID,
		requesterID, req.Status, req.CloseReason); err != nil {

		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "issue status updated successfully"})
}

func (h *IssueHandler) HandleAssignIssue(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req dto.AssignIssueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	assigneeID, err := uuid.Parse(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid user_id format in body"})
		return
	}

	if err := h.issueUseCase.AssignIssue(repoID, issueID, assigneeID,
		requesterID); err != nil {

		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "issue assignee added successfully"})
}

func (h *IssueHandler) HandleUnassignIssue(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	assigneeID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid user_id format"})
		return
	}

	if err := h.issueUseCase.UnassignIssue(repoID, issueID, assigneeID,
		requesterID); err != nil {

		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "issue assignee removed successfully"})
}

func (h *IssueHandler) HandleListIssueAssignees(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	assignees, err := h.issueUseCase.ListIssueAssignees(repoID, issueID,
		requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, assignees)
}

func (h *IssueHandler) HandleListIssueEvents(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	events, err := h.issueUseCase.ListIssueEvents(repoID, issueID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, events)
}

func (h *IssueHandler) HandleListIssueComments(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	comments, err := h.issueUseCase.ListIssueComments(repoID, issueID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, comments)
}

func (h *IssueHandler) HandleCreateIssueComment(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req dto.CreateIssueCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	comment, err := h.issueUseCase.CreateIssueComment(repoID, issueID, requesterID, req.Body)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, comment)
}

func (h *IssueHandler) HandleLinkBranch(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok { return }
	issueID, ok := parseIssueID(c)
	if !ok { return }
	requesterID, ok := parseRequesterID(c)
	if !ok { return }

	var req dto.LinkBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.issueUseCase.LinkBranchToIssue(repoID, issueID, req.BranchName, requesterID); err != nil {
		respondUseCaseError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.MessageResponse{Message: "branch linked successfully"})
}

func (h *IssueHandler) HandleUnlinkBranch(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok { return }
	issueID, ok := parseIssueID(c)
	if !ok { return }
	requesterID, ok := parseRequesterID(c)
	if !ok { return }

	branchName := c.Param("branch_name")
	if branchName == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "missing branch_name"})
		return
	}

	if err := h.issueUseCase.UnlinkBranchFromIssue(repoID, issueID, branchName, requesterID); err != nil {
		respondUseCaseError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.MessageResponse{Message: "branch unlinked successfully"})
}

func (h *IssueHandler) HandleListLinkedBranches(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok { return }
	issueID, ok := parseIssueID(c)
	if !ok { return }
	requesterID, ok := parseRequesterID(c)
	if !ok { return }

	branches, err := h.issueUseCase.ListLinkedBranchesForIssue(repoID, issueID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	if branches == nil {
		branches = []string{}
	}

	c.JSON(http.StatusOK, branches)
}

func (h *IssueHandler) HandleListIssueRelationships(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}
	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	relationships, err := h.issueUseCase.ListIssueRelationships(repoID, issueID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, relationships)
}

func (h *IssueHandler) HandleLinkIssueRelationship(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}
	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req dto.IssueRelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	targetIssueID, err := uuid.Parse(req.TargetIssueID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid target_issue_id format"})
		return
	}

	if err := h.issueUseCase.LinkIssueRelationship(repoID, issueID, targetIssueID, req.RelationshipType, requesterID); err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "issue relationship linked successfully"})
}

func (h *IssueHandler) HandleUnlinkIssueRelationship(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}
	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req dto.IssueRelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	targetIssueID, err := uuid.Parse(req.TargetIssueID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid target_issue_id format"})
		return
	}

	if err := h.issueUseCase.UnlinkIssueRelationship(repoID, issueID, targetIssueID, req.RelationshipType, requesterID); err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "issue relationship unlinked successfully"})
}
