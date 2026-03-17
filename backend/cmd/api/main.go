package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	httpHandler "synergit/internal/adapter/handler/http"
	"synergit/internal/adapter/repository"
	"synergit/internal/core/usecase"

	"github.com/gin-contrib/cors"
)

func main() {
	// 0. Connect to database
	connStr := "postgres://postgres:user@localhost:5432/synergit?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open DB connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}
	fmt.Printf("Connected to PostgreSQL successfully!")

	// 1. Initialize infrastructure adapters
	gitRoot := "D:/SynergitRepo/"
	gitAdapter := repository.NewLocalGitAdapter(gitRoot)
	dbAdapter := repository.NewPostgresRepoStore(db)

	// 2. Initialize usecases (injecting the adapters)
	repoService := usecase.NewRepoService(gitAdapter, dbAdapter)

	// 3. Initialize delivery/handlers (injecting the usecases)
	repoHandler := httpHandler.NewRepoHandler(repoService)

	// 4. Set up the gin router
	router := gin.Default()

	// Config CORS before setting up routes
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Group routes for clean versioning
	v1 := router.Group("/api/v1")
	{
		v1.POST("/repos", repoHandler.HandleCreateRepo)

		// Git Smart HTTP routes
		v1.GET("/repos/:name/info/refs", repoHandler.HandleInfoRefs)
		v1.POST("/repos/:name/git-upload-pack", repoHandler.HandleUploadPack)
		v1.POST("/repos/:name/git-receive-pack", repoHandler.HandleReceivePack)

		v1.GET("/repos", repoHandler.HandleGetRepos)

		// Get repo tree route
		v1.GET("/repos/:name/tree", repoHandler.HandleGetTree)

		// Get file content route
		v1.GET("/repos/:name/blob", repoHandler.HandleGetBlob)
	}

	// 5. Start the server
	fmt.Println("Synergit backend running on port 8080...")
	log.Fatal(router.Run(":8080"))
}
