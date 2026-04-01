package http

import (
	"net/http"
	"strings"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/core/port"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CollaboratorHandler struct {
	collaboratorUsecase port.CollaboratorUsecase
}

func NewCollaboratorHandler(uc port.CollaboratorUsecase) *CollaboratorHandler {
	return &CollaboratorHandler{
		collaboratorUsecase: uc,
	}
}

// POST /repos/:repo_id/collaborators
func (h *CollaboratorHandler) HandleAddCollaborator(c *gin.Context) {
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

	var req dto.AddCollaboratorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	if strings.TrimSpace(req.UserID) == "" || strings.TrimSpace(req.Role) == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "user_id and role are required"})
		return
	}

	targetUserID, err := uuid.Parse(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid user_id format in body"})
		return
	}

	err = h.collaboratorUsecase.AddCollaborator(repoID, targetUserID, req.Role, requesterID)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.MessageResponse{Message: "collaborator added successfully"})
}

// DELETE /repos/:repo_id/collaborators/:user_id
func (h *CollaboratorHandler) HandleRemoveCollaborator(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return
	}

	targetUserIDStr := c.Param("user_id")
	targetUserID, err := uuid.Parse(targetUserIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid target user_id format"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	err = h.collaboratorUsecase.RemoveCollaborator(repoID, targetUserID, requesterID)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "collaborator removed successfully"})
}

// GET /repos/:repo_id/collaborators
func (h *CollaboratorHandler) HandleGetCollaborators(c *gin.Context) {
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

	collabs, err := h.collaboratorUsecase.GetCollaborators(repoID, requesterID)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, collabs)
}
