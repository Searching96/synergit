package http

import (
	"net/http"
	"strings"
	"synergit/internal/adapter/controller/dto"
	"synergit/internal/core/boundary/input"

	"github.com/gin-gonic/gin"
)

type UserSettingsHandler struct {
	userUseCase input.UserUseCase
}

func NewUserSettingsHandler(uuc input.UserUseCase) *UserSettingsHandler {
	return &UserSettingsHandler{userUseCase: uuc}
}

func (h *UserSettingsHandler) HandleChangeUsername(c *gin.Context) {
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var body struct {
		NewUsername string `json:"new_username"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid request"})
		return
	}

	newUsername := strings.TrimSpace(body.NewUsername)

	token, err := h.userUseCase.ChangeUsername(requesterID, newUsername)
	if err != nil {
		if err.Error() == "username is already taken" {
			c.JSON(http.StatusConflict, dto.ErrorResponse{Error: err.Error()})
		} else if err.Error() == "username must be at least 3 characters" {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "username updated successfully", "token": token})
}
