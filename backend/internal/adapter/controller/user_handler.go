package http

import (
	"net/http"
	"strings"
	"synergit/internal/adapter/controller/dto"
	"synergit/internal/core/boundary/input"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userUseCase input.UserUseCase
}

func NewUserHandler(uuc input.UserUseCase) *UserHandler {
	return &UserHandler{userUseCase: uuc}
}

func (h *UserHandler) HandleChangeUsername(c *gin.Context) {
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

func (h *UserHandler) HandleSearchUsers(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "query parameter 'q' is required"})
		return
	}

	users, err := h.userUseCase.SearchUsers(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Error: "failed to search users"})
		return
	}

	// We map the domain users to a simple struct to avoid leaking password hashes, even though they might be empty.
	var result []map[string]interface{}
	for _, u := range users {
		result = append(result, map[string]interface{}{
			"id":       u.ID,
			"username": u.Username,
			"email":    u.Email,
		})
	}

	c.JSON(http.StatusOK, result)
}
