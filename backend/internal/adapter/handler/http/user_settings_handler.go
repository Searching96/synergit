package http

import (
	"net/http"
	"strings"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/core/port"

	"github.com/gin-gonic/gin"
)

type UserSettingsHandler struct {
	userStore port.UserRepository
}

func NewUserSettingsHandler(us port.UserRepository) *UserSettingsHandler {
	return &UserSettingsHandler{userStore: us}
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
	if newUsername == "" || len(newUsername) < 3 {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "username must be at least 3 characters"})
		return
	}

	// Check if username is already taken
	existing, _ := h.userStore.GetUserByUserName(newUsername)
	if existing != nil {
		c.JSON(http.StatusConflict, dto.ErrorResponse{Error: "username is already taken"})
		return
	}

	if err := h.userStore.UpdateUsername(requesterID, newUsername); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "failed to update username"})
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "username updated successfully"})
}
