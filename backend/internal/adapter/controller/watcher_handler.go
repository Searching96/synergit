package http

import (
	"net/http"
	"synergit/internal/adapter/controller/dto"
	"synergit/internal/core/boundary/output"

	"github.com/gin-gonic/gin"
)

type WatcherHandler struct {
	watcherUseCase output.WatcherUseCase
}

func NewWatcherHandler(watcherUseCase output.WatcherUseCase) *WatcherHandler {
	return &WatcherHandler{watcherUseCase: watcherUseCase}
}

func (h *WatcherHandler) HandleGetWatchStatus(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	watched, count, err := h.watcherUseCase.GetStatus(repoID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.WatchStatusResponse{
		Watched: watched,
		Count:   count,
	})
}

func (h *WatcherHandler) HandleWatchRepo(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	watched, count, err := h.watcherUseCase.Watch(repoID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.WatchStatusResponse{
		Watched: watched,
		Count:   count,
	})
}

func (h *WatcherHandler) HandleUnwatchRepo(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	watched, count, err := h.watcherUseCase.Unwatch(repoID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.WatchStatusResponse{
		Watched: watched,
		Count:   count,
	})
}
