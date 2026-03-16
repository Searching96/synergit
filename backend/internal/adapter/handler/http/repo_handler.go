package http

import (
	"net/http"
	"synergit/internal/core/usecase"

	"github.com/gin-gonic/gin"
)

type RepoHandler struct {
	repoUsecase *usecase.RepoService
}

func NewRepoHandler(uc *usecase.RepoService) *RepoHandler {
	return &RepoHandler{
		repoUsecase: uc,
	}
}

type CreateRepoRequest struct {
	Name string `json:"name"`
}

func (h *RepoHandler) HandleCreateRepo(c *gin.Context) {
	var req CreateRepoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	// Call the business logic
	repo, err := h.repoUsecase.CreateRepository(req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Gin handles writing the JSON response and headers
	c.JSON(http.StatusCreated, repo)
}
