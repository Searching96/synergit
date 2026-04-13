package http

import (
	"net/http"
	"strings"
	"synergit/internal/adapter/handler/http/dto"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func parseRequesterID(c *gin.Context) (uuid.UUID, bool) {
	requesterIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{Error: "unauthorized"})
		return uuid.Nil, false
	}

	requesterIDStr, ok := requesterIDRaw.(string)
	if !ok || strings.TrimSpace(requesterIDStr) == "" {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{Error: "invalid requester token"})
		return uuid.Nil, false
	}

	requesterID, err := uuid.Parse(requesterIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{Error: "invalid requester token"})
		return uuid.Nil, false
	}

	return requesterID, true
}

func statusFromUseCaseError(err error) int {
	if err == nil {
		return http.StatusInternalServerError
	}

	msg := strings.ToLower(err.Error())

	switch {
	case strings.Contains(msg, "invalid username or password"):
		return http.StatusUnauthorized
	case strings.Contains(msg, "invalid token"):
		return http.StatusUnauthorized
	case strings.Contains(msg, "unauthorized"):
		return http.StatusForbidden
	case strings.Contains(msg, "permission"):
		return http.StatusForbidden
	case strings.Contains(msg, "forbidden"):
		return http.StatusForbidden
	case strings.Contains(msg, "not found"):
		return http.StatusNotFound
	case strings.Contains(msg, "already exists"):
		return http.StatusConflict
	case strings.Contains(msg, "already"):
		return http.StatusConflict
	case strings.Contains(msg, "duplicate"):
		return http.StatusConflict
	case strings.Contains(msg, "taken"):
		return http.StatusConflict
	case strings.Contains(msg, "invalid"):
		return http.StatusBadRequest
	case strings.Contains(msg, "required"):
		return http.StatusBadRequest
	case strings.Contains(msg, "unsupported"):
		return http.StatusBadRequest
	case strings.Contains(msg, "cannot"):
		return http.StatusBadRequest
	case strings.Contains(msg, "queue is full"):
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

func respondUseCaseError(c *gin.Context, err error) {
	c.JSON(statusFromUseCaseError(err), dto.ErrorResponse{Error: err.Error()})
}
