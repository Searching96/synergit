package http

import (
	"net/http"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PullRequestHandler struct {
	prUsecase port.PullRequestUsecase
}

func NewPullRequestHandler(uc port.PullRequestUsecase) *PullRequestHandler {
	return &PullRequestHandler{prUsecase: uc}
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

	pr, err := h.prUsecase.CreatePullRequest(repoID, requesterID,
		req.Title, req.Description, req.SourceBranch, req.TargetBranch)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, pr)
}

func (h *PullRequestHandler) HandleListPullRequests(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return
	}

	prs, err := h.prUsecase.ListPullRequestsForRepo(repoID)
	if err != nil {
		respondUsecaseError(c, err)
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

	pr, err := h.prUsecase.GetPullRequest(pullID)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}
	if pr == nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{Error: "pull request not found"})
		return
	}

	c.JSON(http.StatusOK, pr)
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

	err = h.prUsecase.MergePullRequest(pullID, requestID)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "pull request merged successfully"})
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

	err = h.prUsecase.ClosePullRequest(pullID, requestID)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "pull request closed successfully"})
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

	conflicts, err := h.prUsecase.GetMergeConflicts(pullID, requesterID)
	if err != nil {
		respondUsecaseError(c, err)
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

	err = h.prUsecase.ResolveConflicts(pullID, requesterID, req.CommitMessage, resolutions)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{
		Message: "conflicts resolved and pull request merged successfully",
	})
}
