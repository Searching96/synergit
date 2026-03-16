package http

import (
	"encoding/json"
	"net/http"
	"synergit/internal/core/usecase"
)

type RepoHandler struct {
	repoUsecase *usecase.RepoService
}

func NewRepoHandler(uc *usecase.RepoService) *RepoHandler {
	return &RepoHandler{
		repoUsecase: uc,
	}
}

type CreateRepoRequest struct {
	Name string `json:"name"`
}

func (h *RepoHandler) HandleCreateRepo(w http.ResponseWriter, r *http.Request) {
	var req CreateRepoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Call the business logic
	repo, err := h.repoUsecase.CreateRepository(req.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(repo)
}
