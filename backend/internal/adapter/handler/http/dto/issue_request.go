package dto

type CreateIssueRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type UpdateIssueStatusRequest struct {
	Status string `json:"status"`
}

type AssignIssueRequest struct {
	UserID string `json:"user_id"`
}
