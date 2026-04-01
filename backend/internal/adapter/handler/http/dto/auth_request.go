package dto

// RegisterRequest defines the expected payload for user registration.
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginRequest defines the expected payload for login.
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
