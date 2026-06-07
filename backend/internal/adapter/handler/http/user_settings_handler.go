package http

import (
	"net/http"
	"strings"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/core/port"
	"time"

	"github.com/gin-gonic/gin"
)

type UserSettingsHandler struct {
	userStore    port.UserRepository
	tokenManager port.TokenManager
}

func NewUserSettingsHandler(us port.UserRepository, tm port.TokenManager) *UserSettingsHandler {
	return &UserSettingsHandler{userStore: us, tokenManager: tm}
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

	// Issue new token with updated username
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	token, err := h.tokenManager.GenerateToken(requesterID.String(), newUsername, expiresAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "username updated but failed to generate new token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "username updated successfully", "token": token})
}
