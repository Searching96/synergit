package http

import (
	"net/http"
	"strings"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/core/port"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authUsecase port.AuthUsecase
}

func NewAuthHandler(uc port.AuthUsecase) *AuthHandler {
	return &AuthHandler{authUsecase: uc}
}

// Handle new user creation
func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	if strings.TrimSpace(req.Username) == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "username is required"})
		return
	}
	if strings.TrimSpace(req.Email) == "" || !strings.Contains(req.Email, "@") {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "valid email is required"})
		return
	}
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "password must be at least 6 characters"})
		return
	}

	err := h.authUsecase.Register(req.Username, req.Email, req.Password)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.MessageResponse{Message: "User registered successfully"})
}

// Handle authenticating a user and returning a JWT
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	if strings.TrimSpace(req.Username) == "" || strings.TrimSpace(req.Password) == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "username and password are required"})
		return
	}

	token, err := h.authUsecase.Login(req.Username, req.Password)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	// Return the JWT to the frontend
	c.JSON(http.StatusOK, dto.TokenResponse{Token: token})
}
