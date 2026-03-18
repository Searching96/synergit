package domain

import (
	"time"
)

// Repository represents the core entity of our SCM module
type Repository struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	CreatedAt time.Time `json:"created_at"`
}
