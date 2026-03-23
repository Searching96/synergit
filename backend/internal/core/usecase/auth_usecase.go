package usecase

import (
	"errors"
	"fmt"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userStore port.UserRepository
	jwtSecret []byte
}

func NewAuthService(userStore port.UserRepository, secret string) *AuthService {
	return &AuthService{
		userStore: userStore,
		jwtSecret: []byte(secret),
	}
}

func (s *AuthService) Register(username string, email string, password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := &domain.User{
		Username:     username,
		Email:        email,
		PasswordHash: string(hashedPassword),
	}

	return s.userStore.CreateUser(user)
}

func (s *AuthService) Login(username string, password string) (string, error) {
	fmt.Printf("Attempting login for Username: '%s', Password length: %d\n", username, len(password))

	user, err := s.userStore.GetUserByUserName(username)
	if err != nil {
		fmt.Printf("DB Fetch Error: %v\n", err)
		return "", errors.New("invalid username or password")
	}

	fmt.Printf("DB User Found: ID=%s, RetrievedHashLength=%d\n", user.ID, len(user.PasswordHash))

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		fmt.Printf("Bcrypt Compare Error: %v\n", err)
		return "", errors.New("invalid username or password")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"exp":      time.Now().Add(time.Hour * 72).Unix(), // Token expires in 72 hours
	})

	return token.SignedString(s.jwtSecret)
}
