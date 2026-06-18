package http

import (
	"net/http"
	"strconv"
	"strings"
	"synergit/internal/adapter/controller/dto"
	"synergit/internal/core/boundary/input"

	"github.com/gin-gonic/gin"
)

type RepoInsightsHandler struct {
	repoInsightsUseCase input.RepoInsightsUseCase
}

func NewRepoInsightsHandler(uc input.RepoInsightsUseCase) *RepoInsightsHandler {
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

func (h *RepoInsightsHandler) HandleGetPulse(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	period := strings.TrimSpace(c.Query("period"))
	snapshot, err := h.repoInsightsUseCase.GetPulse(repoID, requesterID, period)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, snapshot)
}

func (h *RepoInsightsHandler) HandleGetContributors(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	period := strings.TrimSpace(c.Query("period"))
	snapshot, err := h.repoInsightsUseCase.GetContributors(repoID, requesterID, period)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, snapshot)
}

func (h *RepoInsightsHandler) HandleGetCommitActivity(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	snapshot, err := h.repoInsightsUseCase.GetCommitActivity(repoID, requesterID)
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

func (h *RepoInsightsHandler) HandleGetProfileActivity(c *gin.Context) {
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	year := 0
	yearQuery := strings.TrimSpace(c.Query("year"))
	if yearQuery != "" {
		parsedYear, err := strconv.Atoi(yearQuery)
		if err != nil || parsedYear < 0 {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid year"})
			return
		}
		year = parsedYear
	}

	snapshot, err := h.repoInsightsUseCase.GetProfileActivity(requesterID, year)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, snapshot)
}
