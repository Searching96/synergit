package main

import (
	"fmt"
	"log"
	"net/http"

	httpHandler "synergit/internal/adapter/handler/http"
	"synergit/internal/adapter/repository"
	"synergit/internal/core/usecase"
)

func main() {
	// 1. Initialize infrastructure adapters
	gitRoot := "D:/SynergitRepo/"
	gitAdapter := repository.NewLocalGitAdapter(gitRoot)

	// 2. Initialize usecases (injecting the adapters)
	repoService := usecase.NewRepoService(gitAdapter)

	// 3. Initialize delivery/handlers (injecting the usecases)
	repoHandler := httpHandler.NewRepoHandler(repoService)

	// 4. Set up the router
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/repos", repoHandler.HandleCreateRepo)

	// 5. Start the server
	fmt.Println("Synergit backend running on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
