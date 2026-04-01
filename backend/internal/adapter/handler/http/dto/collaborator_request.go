package dto

// AddCollaboratorRequest defines payload for adding a repository collaborator.
type AddCollaboratorRequest struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}
