package http

import (
	"net/http"
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

	token, err := h.authUsecase.Login(req.Username, req.Password)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	// Return the JWT to the frontend
	c.JSON(http.StatusOK, dto.TokenResponse{Token: token})
}
