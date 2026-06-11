package http

import (
	"net/http"
	"synergit/internal/adapter/controller/dto"
	"synergit/internal/core/boundary/input"
	"synergit/internal/core/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PRLabelHandler struct {
	prUseCase input.PullRequestUseCase
}

func NewPRLabelHandler(puc input.PullRequestUseCase) *PRLabelHandler {
	return &PRLabelHandler{prUseCase: puc}
}

func (h *PRLabelHandler) HandleAddLabel(c *gin.Context) {
	prIDStr := c.Param("pull_id")
	prID, err := uuid.Parse(prIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id format"})
		return
	}

	var req dto.AddLabelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid request: " + err.Error()})
		return
	}

	labelID, err := uuid.Parse(req.LabelID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid label_id format"})
		return
	}

	if err := h.prUseCase.AddLabelToPR(prID, labelID); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "Failed to add label"})
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "label added"})
}

func (h *PRLabelHandler) HandleRemoveLabel(c *gin.Context) {
	prID, err := uuid.Parse(c.Param("pull_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id"})
		return
	}
	labelID, err := uuid.Parse(c.Param("label_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid label_id"})
		return
	}
	if err := h.prUseCase.RemoveLabelFromPR(prID, labelID); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "Failed to remove label"})
		return
	}
	c.JSON(http.StatusOK, dto.MessageResponse{Message: "label removed"})
}

func (h *PRLabelHandler) HandleListLabels(c *gin.Context) {
	prID, err := uuid.Parse(c.Param("pull_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id"})
		return
	}
	labels, err := h.prUseCase.ListPRLabels(prID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "Failed to list labels"})
		return
	}
	if labels == nil {
		labels = []domain.Label{}
	}
	c.JSON(http.StatusOK, labels)
}

func (h *PRLabelHandler) HandleAssignUser(c *gin.Context) {
	prID, err := uuid.Parse(c.Param("pull_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id"})
		return
	}
	var body struct {
		UserID string `json:"user_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid body"})
		return
	}
	userID, err := uuid.Parse(body.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid user_id"})
		return
	}
	if err := h.prUseCase.AssignPR(prID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "Failed to assign user"})
		return
	}
	c.JSON(http.StatusOK, dto.MessageResponse{Message: "assigned"})
}

func (h *PRLabelHandler) HandleUnassignUser(c *gin.Context) {
	prID, err := uuid.Parse(c.Param("pull_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id"})
		return
	}
	userID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid user_id"})
		return
	}
	if err := h.prUseCase.UnassignPR(prID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "Failed to unassign user"})
		return
	}
	c.JSON(http.StatusOK, dto.MessageResponse{Message: "unassigned"})
}

func (h *PRLabelHandler) HandleListAssignees(c *gin.Context) {
	prID, err := uuid.Parse(c.Param("pull_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid pull_id"})
		return
	}
	assignees, err := h.prUseCase.ListPRAssignees(prID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "Failed to list assignees"})
		return
	}
	if assignees == nil {
		assignees = []domain.PRAssignee{}
	}
	c.JSON(http.StatusOK, assignees)
}
