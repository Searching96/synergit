package http

import (
	"net/http"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/core/port"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type IssueHandler struct {
	issueUseCase port.IssueUseCase
}

func NewIssueHandler(uc port.IssueUseCase) *IssueHandler {
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
		requesterID, req.Status); err != nil {

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
