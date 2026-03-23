package domain

import (
	"time"
)

// Repo represents the core entity of our SCM module
type Repo struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	CreatedAt time.Time `json:"created_at"`
}
