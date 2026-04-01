package security

import (
	"time"

	"synergit/internal/core/port"

	"github.com/golang-jwt/jwt/v5"
)

var _ port.TokenManager = (*JWTTokenManager)(nil)

type JWTTokenManager struct {
	secret []byte
}

func NewJWTTokenManager(secret string) *JWTTokenManager {
	return &JWTTokenManager{secret: []byte(secret)}
}

func (m *JWTTokenManager) GenerateToken(userID string, username string, expiresAt time.Time) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"exp":      expiresAt.Unix(),
	})

	return token.SignedString(m.secret)
}
