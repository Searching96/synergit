package http

import (
	"net/http"
	"synergit/internal/adapter/controller/dto"
	"synergit/internal/core/boundary/input"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LabelHandler struct {
	labelUseCase input.LabelUseCase
}

func NewLabelHandler(uc input.LabelUseCase) *LabelHandler {
	return &LabelHandler{labelUseCase: uc}
}

func (h *LabelHandler) HandleListLabels(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	labels, err := h.labelUseCase.ListLabels(repoID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, labels)
}

func (h *LabelHandler) HandleListIssueLabels(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	labels, err := h.labelUseCase.ListIssueLabels(repoID, issueID, requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, labels)
}

func (h *LabelHandler) HandleAddLabelToIssue(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req dto.AddLabelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	labelID, err := uuid.Parse(req.LabelID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid label_id format in body"})
		return
	}

	if err := h.labelUseCase.AddLabelToIssue(repoID, issueID, labelID, requesterID); err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "label added to issue successfully"})
}

func (h *LabelHandler) HandleRemoveLabelFromIssue(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	issueID, ok := parseIssueID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	labelID, err := uuid.Parse(c.Param("label_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid label_id format"})
		return
	}

	if err := h.labelUseCase.RemoveLabelFromIssue(repoID, issueID, labelID, requesterID); err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "label removed from issue successfully"})
}
