package http

import (
	"net/http"
	"synergit/internal/core/usecase"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CollaboratorHandler struct {
	collaboratorUsecase *usecase.CollaboratorService
}

func NewCollaboratorHandler(uc *usecase.CollaboratorService) *CollaboratorHandler {
	return &CollaboratorHandler{
		collaboratorUsecase: uc,
	}
}

// POST /repos/:repo_id/collaborators
func (h *CollaboratorHandler) HandleAddCollaborator(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid repo_id format"})
		return
	}

	// Extract requester ID from JWT middleware
	requesterIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	requesterID, err := uuid.Parse(requesterIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid requester token"})
		return
	}

	var req struct {
		UserID string `json:"user_id" binding:"required"`
		Role   string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	targetUserID, err := uuid.Parse(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id format in body"})
		return
	}

	err = h.collaboratorUsecase.AddCollaborator(repoID, targetUserID, req.Role, requesterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "collaborator added successfully"})
}

// DELETE /repos/:repo_id/collaborators/:user_id
func (h *CollaboratorHandler) HandleRemoveCollaborator(c *gin.Context) {
	repoIDStr := c.Param("repo_id")
	repoID, err := uuid.Parse(repoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid repo_id format"})
		return
	}

	targetUserIDStr := c.Param("user_id")
	targetUserID, err := uuid.Parse(targetUserIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid target user_id format"})
		return
	}

	requesterIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	requesterID, err := uuid.Parse(requesterIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid requester token"})
		return
	}

	err = h.collaboratorUsecase.RemoveCollaborator(repoID, targetUserID, requesterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "collaborator removed successfully"})
}

// GET /repos/:repo_id/collaborators
func (h *CollaboratorHandler) HandleGetCollaborators(c *gin.Context) {
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid requester token"})
		return
	}

	collabs, err := h.collaboratorUsecase.GetCollaborators(repoID, requesterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, collabs)
}
