package http

import (
	"net/http"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/adapter/repository/postgres"
	"synergit/internal/core/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PRLabelHandler struct {
	labelStore    *postgres.PullRequestLabelStore
	assigneeStore *postgres.PullRequestAssigneeStore
}

func NewPRLabelHandler(ls *postgres.PullRequestLabelStore, as *postgres.PullRequestAssigneeStore) *PRLabelHandler {
	return &PRLabelHandler{labelStore: ls, assigneeStore: as}
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

	if err := h.labelStore.Add(prID, labelID); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: err.Error()})
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
	if err := h.labelStore.Remove(prID, labelID); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: err.Error()})
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
	labels, err := h.labelStore.ListForPR(prID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: err.Error()})
		return
	}
	if labels == nil {
		labels = []domain.Label{}
	}
	c.JSON(http.StatusOK, labels)
}

func (h *PRLabelHandler) HandleAssign(c *gin.Context) {
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
	if err := h.assigneeStore.Assign(prID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, dto.MessageResponse{Message: "assigned"})
}

func (h *PRLabelHandler) HandleUnassign(c *gin.Context) {
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
	if err := h.assigneeStore.Unassign(prID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: err.Error()})
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
	assignees, err := h.assigneeStore.List(prID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: err.Error()})
		return
	}
	if assignees == nil {
		assignees = []postgres.PRAssignee{}
	}
	c.JSON(http.StatusOK, assignees)
}
