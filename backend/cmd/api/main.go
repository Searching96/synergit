package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	httpHandler "synergit/internal/adapter/handler/http"
	"synergit/internal/adapter/handler/http/middleware"
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
	dbRepoAdapter := repository.NewPostgresRepoStore(db)
	dbUserAdapter := repository.NewPostgresUserAdapter(db)

	// 2. Initialize usecases (injecting the adapters)
	// In production, load this secret from an env var
	jwtSecret := "my-super-secret-jwt-key-change-me"

	repoUsecase := usecase.NewRepoService(gitAdapter, dbRepoAdapter)
	authUsecase := usecase.NewAuthService(dbUserAdapter, jwtSecret)

	// 3. Initialize delivery/handlers (injecting the usecases)
	repoHandler := httpHandler.NewRepoHandler(repoUsecase)
	authHandler := httpHandler.NewAuthHandler(authUsecase)

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
		// Auth routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Repo routes (we will secure these with JWT middleware soon)
		repos := v1.Group("/repos")
		repos.Use(middleware.AuthMiddleware(jwtSecret)) // Apply middleware before further routing
		{
			repos.GET("", repoHandler.HandleGetRepos)
			repos.GET("/:name/branches", repoHandler.HandleGetBranches)
			repos.GET("/:name/tree", repoHandler.HandleGetTree)
			repos.GET("/:name/blob", repoHandler.HandleGetBlob)
			repos.GET("/:name/commits", repoHandler.HandleGetCommits)
		}
	}

	// 5. Start the server
	fmt.Println("Synergit backend running on port 8080...")
	log.Fatal(router.Run(":8080"))
}
