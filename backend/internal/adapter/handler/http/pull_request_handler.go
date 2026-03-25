package http

import (
	"net/http"
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid repo_id format"})
		return
	}

	requesterIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	requesterID, err := uuid.Parse(requesterIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid requester token"})
		return
	}

	var req struct {
		Title        string `json:"title" binding:"required"`
		Description  string `json:"description"`
		SourceBranch string `json:"source_branch" binding:"required"`
		TargetBranch string `json:"target_branch" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pr, err := h.prUsecase.CreatePullRequest(repoID, requesterID,
		req.Title, req.Description, req.SourceBranch, req.TargetBranch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erorr": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, pr)
}

func (h *PullRequestHandler) HandleListPullRequests(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid repo_id format"})
		return
	}

	prs, err := h.prUsecase.ListPullRequestsForRepo(repoID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, prs)
}

func (h *PullRequestHandler) HandleGetPullRequest(c *gin.Context) {
	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pull_id format"})
		return
	}

	pr, err := h.prUsecase.GetPullRequest(pullID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if pr == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "pull request not found"})
		return
	}

	c.JSON(http.StatusOK, pr)
}

func (h *PullRequestHandler) HandleMergePullRequest(c *gin.Context) {
	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pull_id format"})
		return
	}

	requesterIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
	}
	requestID, err := uuid.Parse(requesterIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid requester token"})
		return
	}

	err = h.prUsecase.MergePullRequest(pullID, requestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "pull request merged successfully"})
}

func (h *PullRequestHandler) HandleClosePullRequest(c *gin.Context) {
	pullIDStr := c.Param("pull_id")
	pullID, err := uuid.Parse(pullIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pull_id format"})
		return
	}

	requesterIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	requestID, err := uuid.Parse(requesterIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid requester token"})
		return
	}

	err = h.prUsecase.ClosePullRequest(pullID, requestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "pull request closed successfully"})
}
