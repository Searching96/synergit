package dto

import "time"

// ErrorResponse is the standard error payload for JSON APIs.
type ErrorResponse struct {
	Error string `json:"error"`
}

// MessageResponse is the standard success payload when no object is returned.
type MessageResponse struct {
	Message string `json:"message"`
}

// TokenResponse is the auth response payload.
type TokenResponse struct {
	Token string `json:"token"`
}

// RepoResponse is the repository payload returned by repository APIs.
type RepoResponse struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Path            string    `json:"path"`
	CreatedAt       time.Time `json:"created_at"`
	Description     string    `json:"description,omitempty"`
	Visibility      string    `json:"visibility"`
	PrimaryLanguage string    `json:"primary_language,omitempty"`
	Owner           string    `json:"owner"`
	CloneURL        string    `json:"clone_url"`
}
