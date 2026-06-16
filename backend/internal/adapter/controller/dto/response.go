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

// CountResponse is the standard payload for lightweight count endpoints.
type CountResponse struct {
	Count int `json:"count"`
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
	Website         string    `json:"website,omitempty"`
	Topics          []string  `json:"topics,omitempty"`
	Visibility      string    `json:"visibility"`
	PrimaryLanguage string    `json:"primary_language,omitempty"`
	Owner           string    `json:"owner"`
	CloneURL        string    `json:"clone_url"`
	OpenIssuesCount int       `json:"open_issues_count"`
	OpenPullsCount  int       `json:"open_pulls_count"`
	ParentID        *string   `json:"parent_id,omitempty"`
}
