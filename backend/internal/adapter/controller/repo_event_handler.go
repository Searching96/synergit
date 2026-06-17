package http

import (
	"net/http"
	"synergit/internal/core/domain"
	"synergit/internal/core/boundary/output"
	"strconv"

	"github.com/gin-gonic/gin"
)

type RepoEventHandler struct {
	repoEventUseCase output.RepoEventUseCase
}

func NewRepoEventHandler(usecase output.RepoEventUseCase) *RepoEventHandler {
	return &RepoEventHandler{repoEventUseCase: usecase}
}

func (h *RepoEventHandler) HandleGetActivity(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	eventTypeStr := c.Query("event_type")
	var eventType *domain.EventType
	if eventTypeStr != "" {
		t := domain.EventType(eventTypeStr)
		eventType = &t
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	events, err := h.repoEventUseCase.GetRepoEvents(repoID, eventType, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if events == nil {
		events = []domain.RepoEvent{}
	}

	c.JSON(http.StatusOK, events)
}
