package domain

import (
	"fmt"
	"strings"
	"time"
)

const MinPasswordLength = 6

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // The "-" prevents this from ever being serialize to JSON
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func ValidateRegistrationInput(username string, email string, password string) error {
	if strings.TrimSpace(username) == "" {
		return fmt.Errorf("username is required")
	}

	if strings.TrimSpace(email) == "" {
		return fmt.Errorf("email is required")
	}

	if !strings.Contains(email, "@") {
		return fmt.Errorf("invalid email format")
	}

	if strings.TrimSpace(password) == "" {
		return fmt.Errorf("password is required")
	}

	if len(password) < MinPasswordLength {
		return fmt.Errorf("invalid password: must be at least %d characters",
			MinPasswordLength)
	}

	return nil
}

func ValidateLoginInput(username string, password string) error {
	if strings.TrimSpace(username) == "" {
		return fmt.Errorf("username is required")
	}

	if strings.TrimSpace(password) == "" {
		return fmt.Errorf("password is required")
	}

	return nil
}
