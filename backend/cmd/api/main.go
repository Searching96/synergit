package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

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

	// 4. Set up the gin router
	router := gin.Default()

	// Group routes for clean versioning
	v1 := router.Group("/api/v1")
	{
		v1.POST("/repos", repoHandler.HandleCreateRepo)

		// Git Smart HTTP routes
		v1.GET("/repos/:name/info/refs", repoHandler.HandleInfoRefs)
		v1.POST("/repos/:name/git-upload-pack", repoHandler.HandleUploadPack)
	}

	// 5. Start the server
	fmt.Println("Synergit backend running on port 8080...")
	log.Fatal(router.Run(":8080"))
}
