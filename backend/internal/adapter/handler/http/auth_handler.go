package http

import (
	"net/http"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/core/port"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authUseCase port.AuthUseCase
}

func NewAuthHandler(uc port.AuthUseCase) *AuthHandler {
	return &AuthHandler{authUseCase: uc}
}

// Handle new user creation
func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	err := h.authUseCase.Register(req.Username, req.Email, req.Password)
	if err != nil {
		respondUseCaseError(c, err)
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

	token, err := h.authUseCase.Login(req.Username, req.Password)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	// Return the JWT to the frontend
	c.JSON(http.StatusOK, dto.TokenResponse{Token: token})
}
