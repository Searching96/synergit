package http

import (
	"net/http"
	"strings"
	"synergit/internal/adapter/controller/dto"
	"synergit/internal/core/boundary/input"
	"synergit/internal/core/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PullRequestHandler struct {
	prUseCase input.PullRequestUseCase
}

func NewPullRequestHandler(uc input.PullRequestUseCase) *PullRequestHandler {
	return &PullRequestHandler{prUseCase: uc}
}

func (h *PullRequestHandler) HandleCreatePullRequest(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req dto.CreatePullRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	pr, err := h.prUseCase.CreatePullRequest(repoID, requesterID,
		req.Title, req.Description, req.SourceBranch, req.TargetBranch)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, pr)
}

func (h *PullRequestHandler) HandleComparePullRequestRefs(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	baseRef := strings.TrimSpace(c.Query("base"))
	headRef := strings.TrimSpace(c.Query("head"))
	if baseRef == "" || headRef == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "base and head query params are required"})
		return
	}

	result, err := h.prUseCase.ComparePullRequestRefs(repoID, requesterID, baseRef, headRef)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *PullRequestHandler) HandleListPullRequests(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return
	}

	prs, err := h.prUseCase.ListPullRequestsForRepo(repoID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, prs)
}

func (h *PullRequestHandler) HandleGetPullRequest(c *gin.Context) {
	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	pr, err := h.prUseCase.GetPullRequest(pullID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}
	if pr == nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{Error: "pull request not found"})
		return
	}

	c.JSON(http.StatusOK, pr)
}

func (h *PullRequestHandler) HandleListPullRequestEvents(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return
	}

	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	events, err := h.prUseCase.ListPullRequestEvents(repoID, pullID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, events)
}

func (h *PullRequestHandler) HandleMergePullRequest(c *gin.Context) {
	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	requestID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var body struct {
		CommitMessage string `json:"commit_message"`
		Description   string `json:"description"`
	}
	// ignore bind errors — body is optional
	_ = c.ShouldBindJSON(&body)

	err = h.prUseCase.MergePullRequest(pullID, requestID, body.CommitMessage, body.Description)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "pull request merged successfully"})
}

func (h *PullRequestHandler) HandleRevertPullRequest(c *gin.Context) {
	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	requestID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	pr, err := h.prUseCase.RevertPullRequest(pullID, requestID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, pr)
}

func (h *PullRequestHandler) HandleClosePullRequest(c *gin.Context) {
	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	requestID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	err = h.prUseCase.ClosePullRequest(pullID, requestID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "pull request closed successfully"})
}

func (h *PullRequestHandler) HandleReopenPullRequest(c *gin.Context) {
	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	requestID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	err = h.prUseCase.ReopenPullRequest(pullID, requestID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "pull request reopened successfully"})
}

func (h *PullRequestHandler) HandleGetMergeConflicts(c *gin.Context) {
	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	conflicts, err := h.prUseCase.GetMergeConflicts(pullID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, conflicts)
}

func (h *PullRequestHandler) HandleResolveConflicts(c *gin.Context) {
	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req dto.ResolveConflictsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid request payload: " + err.Error()})
		return
	}

	resolutions := make([]domain.ConflictResolution, 0, len(req.Resolutions))
	for _, resolution := range req.Resolutions {
		resolutions = append(resolutions, domain.ConflictResolution{
			Path:            resolution.Path,
			ResolvedContent: resolution.ResolvedContent,
		})
	}

	err = h.prUseCase.ResolveConflicts(pullID, requesterID, req.CommitMessage, resolutions)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{
		Message: "conflicts resolved successfully",
	})
}

func (h *PullRequestHandler) HandleLinkIssue(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return
	}

	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req struct {
		IssueID string `json:"issue_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid request payload"})
		return
	}

	issueID, err := uuid.Parse(req.IssueID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid issue_id format"})
		return
	}

	if err := h.prUseCase.LinkIssueToPR(repoID, pullID, issueID, requesterID); err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.MessageResponse{Message: "issue linked successfully"})
}

func (h *PullRequestHandler) HandleUnlinkIssue(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return
	}

	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	issueIDStr := c.Param("issue_id")
	issueID, err := uuid.Parse(issueIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid issue_id format"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	if err := h.prUseCase.UnlinkIssueFromPR(repoID, pullID, issueID, requesterID); err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "issue unlinked successfully"})
}

func (h *PullRequestHandler) HandleListLinkedIssues(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return
	}

	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	issues, err := h.prUseCase.ListLinkedIssuesForPR(repoID, pullID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	if issues == nil {
		issues = []domain.Issue{}
	}

	c.JSON(http.StatusOK, issues)
}

func (h *PullRequestHandler) HandleListLinkedPRsForIssue(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return
	}

	issueIDStr := c.Param("issue_id")
	issueID, err := uuid.Parse(issueIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid issue_id format"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	prs, err := h.prUseCase.ListLinkedPRsForIssue(repoID, issueID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	if prs == nil {
		prs = []domain.PullRequest{}
	}

	c.JSON(http.StatusOK, prs)
}
