package http

import (
	"net/http"
	"strings"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/core/port"

	"github.com/gin-gonic/gin"
)

type RepoInsightsHandler struct {
	repoInsightsUseCase port.RepoInsightsUseCase
}

func NewRepoInsightsHandler(uc port.RepoInsightsUseCase) *RepoInsightsHandler {
	return &RepoInsightsHandler{repoInsightsUseCase: uc}
}

func (h *RepoInsightsHandler) HandleGetLatestInsights(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	snapshot, err := h.repoInsightsUseCase.GetLatestInsights(repoID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, snapshot)
}

func (h *RepoInsightsHandler) HandleTriggerRecompute(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	trigger := strings.TrimSpace(c.Query("trigger"))
	if trigger == "" {
		trigger = "manual_api"
	}

	if err := h.repoInsightsUseCase.TriggerRecompute(repoID, requesterID, trigger); err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusAccepted, dto.MessageResponse{Message: "insights recompute queued"})
}
