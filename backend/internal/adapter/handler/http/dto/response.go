package dto

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
