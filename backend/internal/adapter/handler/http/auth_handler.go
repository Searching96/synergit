package http

import (
	"net/http"
	"synergit/internal/core/usecase"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *usecase.AuthService
}

func NewAuthHandler(authService *usecase.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Structs to define the expected JSON payloads
type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Handle new user creation
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.authService.Register(req.Username, req.Email, req.Password)
	if err != nil {
		// If it fails, it's usually because the username/email already exists
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to register user. Username or email may already be taken."})
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}

// Handle authenticating a user and returning a JWT
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Return the JWT to the frontend
	c.JSON(http.StatusOK, gin.H{"token": token})
}
