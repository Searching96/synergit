package http

import (
	"net/http"
	"synergit/internal/adapter/controller/dto"
	"synergit/internal/core/boundary/input"

	"github.com/gin-gonic/gin"
)

type StarHandler struct {
	starUseCase input.StarUseCase
}

func NewStarHandler(uc input.StarUseCase) *StarHandler {
	return &StarHandler{starUseCase: uc}
}

func (h *StarHandler) HandleGetStarStatus(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	starred, count, err := h.starUseCase.GetStatus(repoID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.StarStatusResponse{Starred: starred, Count: count})
}

func (h *StarHandler) HandleStarRepo(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	starred, count, err := h.starUseCase.Star(repoID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.StarStatusResponse{Starred: starred, Count: count})
}

func (h *StarHandler) HandleUnstarRepo(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	starred, count, err := h.starUseCase.Unstar(repoID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.StarStatusResponse{Starred: starred, Count: count})
}

func (h *StarHandler) HandleListStarred(c *gin.Context) {
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	repos, err := h.starUseCase.ListStarred(requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, repos)
}

func (h *StarHandler) HandleCountStarred(c *gin.Context) {
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	count, err := h.starUseCase.CountStarred(requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.CountResponse{Count: count})
}
