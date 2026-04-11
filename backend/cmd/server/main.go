package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	httpHandler "synergit/internal/adapter/handler/http"
	"synergit/internal/adapter/handler/http/middleware"
	"synergit/internal/adapter/repository"
	"synergit/internal/adapter/repository/postgres"
	"synergit/internal/adapter/security"
	"synergit/internal/core/usecase"

	"github.com/gin-contrib/cors"
	_ "github.com/lib/pq" // Ensure you have your postgres driver imported!
)

func main() {
	// 0. Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	host := strings.TrimSpace(os.Getenv("HOST"))
	if host == "" {
		host = "localhost"
	}
	publicBaseURL := fmt.Sprintf("http://%s:%s", host, port)

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
	dbPRAdapter := postgres.NewPostgresPullRequestStore(db)
	dbIssueAdapter := postgres.NewPostgresIssueStore(db)
	dbRepoInsightsAdapter := postgres.NewPostgresRepoInsightsStore(db)

	// 3. Initialize usecases (injecting the adapters)
	jwtSecret := os.Getenv("JWT_SECRET")
	passwordHasher := security.NewBcryptPasswordHasher(0)
	tokenManager := security.NewJWTTokenManager(jwtSecret)

	repoInsightUsecase := usecase.NewRepoInsightsService(dbRepoInsightsAdapter, dbRepoAdapter,
		dbCollabAdapter, gitAdapter)
	repoUsecase := usecase.NewRepoService(gitAdapter, dbRepoAdapter, dbCollabAdapter,
		dbUserAdapter, repoInsightUsecase)
	authUsecase := usecase.NewAuthService(dbUserAdapter, passwordHasher, tokenManager)
	collabUsecase := usecase.NewCollaboratorService(dbCollabAdapter)
	issueUsecase := usecase.NewIssueService(dbIssueAdapter, dbCollabAdapter)
	prUsecase := usecase.NewPullRequestService(dbPRAdapter, dbCollabAdapter,
		gitAdapter, dbRepoAdapter, dbUserAdapter)

	// 4. Initialize delivery/handlers (injecting the usecases)
	repoHandler := httpHandler.NewRepoHandler(repoUsecase, publicBaseURL)
	authHandler := httpHandler.NewAuthHandler(authUsecase)
	collabHandler := httpHandler.NewCollaboratorHandler(collabUsecase)
	issueHandler := httpHandler.NewIssueHandler(issueUsecase)
	prHandler := httpHandler.NewPullRequestHandler(prUsecase)
	repoInsightsHandler := httpHandler.NewRepoInsightsHandler(repoInsightUsecase)

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

	// Public Git Smart HTTP routes for clone/fetch operations
	router.GET("/:username/:repo_git/info/refs", repoHandler.HandleInfoRefsPublic)
	router.POST("/:username/:repo_git/git-upload-pack", repoHandler.HandleUploadPackPublic)
	router.POST("/:username/:repo_git/git-receive-pack", repoHandler.HandleReceivePackPublic)

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
			// Repo routes
			repos.POST("", repoHandler.HandleCreateRepo)
			repos.GET("", repoHandler.HandleGetRepos)
			repos.POST("/:repo_id/branches", repoHandler.HandleCreateBranch)
			repos.GET("/:repo_id/branches", repoHandler.HandleGetBranches)
			repos.GET("/:repo_id/tree", repoHandler.HandleGetTree)
			repos.GET("/:repo_id/blob", repoHandler.HandleGetBlob)
			repos.GET("/:repo_id/commits", repoHandler.HandleGetCommits)
			repos.POST("/:repo_id/commit-file", repoHandler.HandleCommitFileChange)
			repos.GET("/:repo_id/insights", repoInsightsHandler.HandleGetLatestInsights)
			repos.POST("/:repo_id/insights/recompute", repoInsightsHandler.HandleTriggerRecompute)

			// Collab routes
			repos.POST("/:repo_id/collabs", collabHandler.HandleAddCollaborator)
			repos.GET("/:repo_id/collabs", collabHandler.HandleGetCollaborators)
			repos.DELETE("/:repo_id/collabs/:user_id", collabHandler.HandleRemoveCollaborator)

			// Pull request routes
			repos.POST("/:repo_id/pulls", prHandler.HandleCreatePullRequest)
			repos.GET("/:repo_id/pulls", prHandler.HandleListPullRequests)
			repos.GET("/:repo_id/pulls/:pull_id", prHandler.HandleGetPullRequest)
			repos.POST("/:repo_id/pulls/:pull_id/merge", prHandler.HandleMergePullRequest)
			repos.POST("/:repo_id/pulls/:pull_id/close", prHandler.HandleClosePullRequest)

			// Issue routes
			repos.POST("/:repo_id/issues", issueHandler.HandleCreateIssue)
			repos.GET("/:repo_id/issues", issueHandler.HandleListIssues)
			repos.GET("/:repo_id/issues/:issue_id", issueHandler.HandleGetIssue)
			repos.PATCH("/:repo_id/issues/:issue_id/status", issueHandler.HandleUpdateIssueStatus)
			repos.GET("/:repo_id/issues/:issue_id/assignees", issueHandler.HandleListIssueAssignees)
			repos.POST("/:repo_id/issues/:issue_id/assignees", issueHandler.HandleAssignIssue)
			repos.DELETE("/:repo_id/issues/:issue_id/assignees/:user_id", issueHandler.HandleUnassignIssue)

			// Resolve conflicts routes
			repos.GET("/:repo_id/pulls/:pull_id/conflicts", prHandler.HandleGetMergeConflicts)
			repos.POST("/:repo_id/pulls/:pull_id/conflicts/resolve", prHandler.HandleResolveConflicts)
		}
	}

	// 6. Start the server
	fmt.Printf("Synergit backend running on port %s...\n", port)
	log.Fatal(router.Run(":" + port))
}
