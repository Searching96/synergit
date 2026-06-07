package http

import (
	"database/sql"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/core/port"
	"time"

	"github.com/gin-gonic/gin"
)

type UserSettingsHandler struct {
	userStore    port.UserRepository
	tokenManager port.TokenManager
	gitRoot      string
	db           *sql.DB
}

func NewUserSettingsHandler(us port.UserRepository, tm port.TokenManager, gitRoot string, db *sql.DB) *UserSettingsHandler {
	return &UserSettingsHandler{userStore: us, tokenManager: tm, gitRoot: gitRoot, db: db}
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

	// Get current username for folder rename
	currentUser, err := h.userStore.GetUserByID(requesterID)
	if err != nil || currentUser == nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "failed to find user"})
		return
	}
	oldUsername := currentUser.Username

	// Update DB
	if err := h.userStore.UpdateUsername(requesterID, newUsername); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "failed to update username"})
		return
	}

	// Rename git storage folder
	if h.gitRoot != "" && oldUsername != "" {
		oldPath := filepath.Join(h.gitRoot, oldUsername)
		newPath := filepath.Join(h.gitRoot, newUsername)
		if _, err := os.Stat(oldPath); err == nil {
			_ = os.Rename(oldPath, newPath)
		}
	}

	// Update repo paths in DB: replace "oldUsername/" prefix with "newUsername/"
	h.updateRepoPaths(oldUsername, newUsername)

	// Issue new token with updated username
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	token, err := h.tokenManager.GenerateToken(requesterID.String(), newUsername, expiresAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "username updated but failed to generate new token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "username updated successfully", "token": token})
}


func (h *UserSettingsHandler) updateRepoPaths(oldUsername, newUsername string) {
	if h.db == nil {
		return
	}
	// Update paths like "oldUsername/repo.git" -> "newUsername/repo.git"
	_, _ = h.db.Exec(
		`UPDATE repositories SET path = $1 || substring(path from length($2) + 1) WHERE path LIKE $2 || '%'`,
		newUsername, oldUsername,
	)
}
