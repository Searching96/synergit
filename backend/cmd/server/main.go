package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	httpHandler "synergit/internal/adapter/handler/http"
	"synergit/internal/adapter/handler/http/middleware"
	"synergit/internal/adapter/repository"
	"synergit/internal/adapter/repository/postgres"
	"synergit/internal/core/usecase"

	"github.com/gin-contrib/cors"
	_ "github.com/lib/pq" // Ensure you have your postgres driver imported!
)

func main() {
	// 0. Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// 1. Connect to database
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open DB connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}
	fmt.Println("Connected to PostgreSQL successfully!")

	// 2. Initialize infrastructure adapters
	gitRoot := os.Getenv("GIT_ROOT")
	gitAdapter := repository.NewLocalGitAdapter(gitRoot)

	dbRepoAdapter := postgres.NewPostgresRepoStore(db)
	dbUserAdapter := postgres.NewPostgresUserStore(db)
	dbCollabAdapter := postgres.NewPostgresCollaboratorStore(db)

	// 3. Initialize usecases (injecting the adapters)
	jwtSecret := os.Getenv("JWT_SECRET")

	repoUsecase := usecase.NewRepoService(gitAdapter, dbRepoAdapter, dbCollabAdapter)
	authUsecase := usecase.NewAuthService(dbUserAdapter, jwtSecret)
	collabUsecase := usecase.NewCollaboratorService(dbCollabAdapter)

	// 4. Initialize delivery/handlers (injecting the usecases)
	repoHandler := httpHandler.NewRepoHandler(repoUsecase)
	authHandler := httpHandler.NewAuthHandler(authUsecase)
	collabHandler := httpHandler.NewCollaboratorHandler(collabUsecase)

	// 5. Set up the gin router
	router := gin.Default()

	// Config CORS
	frontendURL := os.Getenv("FRONTEND_URL")
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
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

		// Repo routes secured with JWT
		repos := v1.Group("/repos")
		repos.Use(middleware.AuthMiddleware(jwtSecret))
		{
			// Existing repo routes
			repos.POST("", repoHandler.HandleCreateRepo)
			repos.GET("", repoHandler.HandleGetRepos)
			repos.GET("/:repo_id/branches", repoHandler.HandleGetBranches)
			repos.GET("/:repo_id/tree", repoHandler.HandleGetTree)
			repos.GET("/:repo_id/blob", repoHandler.HandleGetBlob)
			repos.GET("/:repo_id/commits", repoHandler.HandleGetCommits)

			repos.POST("/:repo_id/collaborators", collabHandler.HandleAddCollaborator)
			repos.GET("/:repo_id/collaborators", collabHandler.HandleGetCollaborators)
			repos.DELETE("/:repo_id/collaborators/:user_id", collabHandler.HandleRemoveCollaborator)
		}
	}

	// 6. Start the server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Fallback if not set
	}

	fmt.Printf("Synergit backend running on port %s...\n", port)
	log.Fatal(router.Run(":" + port))
}
