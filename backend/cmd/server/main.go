package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"synergit/internal/adapter/gateway/git_analysis"
	httpHandler "synergit/internal/adapter/controller"
	"synergit/internal/adapter/controller/middleware"
	"synergit/internal/adapter/repository"
	"synergit/internal/adapter/repository/postgres"
	"synergit/internal/adapter/gateway/security"
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
	dbLabelAdapter := postgres.NewPostgresLabelStore(db)
	dbStarAdapter := postgres.NewPostgresStarStore(db)
	dbRepoInsightsAdapter := postgres.NewPostgresRepoInsightsStore(db)

	// 3. Initialize usecases (injecting the adapters)
	jwtSecret := os.Getenv("JWT_SECRET")
	passwordHasher := security.NewBcryptPasswordHasher(0)
	tokenManager := security.NewJWTTokenManager(jwtSecret)
	repoInsightsMetricComputer := git_analysis.NewRepoInsightsMetricComputer()

	repoInsightUseCase := usecase.NewRepoInsightsService(dbRepoInsightsAdapter, dbRepoAdapter,
		dbCollabAdapter, dbIssueAdapter, dbPRAdapter, dbUserAdapter, gitAdapter,
		repoInsightsMetricComputer)
	repoUseCase := usecase.NewRepoService(gitAdapter, dbRepoAdapter, dbCollabAdapter,
		dbUserAdapter, repoInsightUseCase)
	authUseCase := usecase.NewAuthService(dbUserAdapter, passwordHasher, tokenManager)
	collabUseCase := usecase.NewCollaboratorService(dbCollabAdapter)
	issueUseCase := usecase.NewIssueService(dbIssueAdapter, dbCollabAdapter)
	labelUseCase := usecase.NewLabelService(dbLabelAdapter, dbIssueAdapter, dbCollabAdapter)
	starUseCase := usecase.NewStarService(dbStarAdapter)
	prLabelStore := postgres.NewPullRequestLabelStore(db)
	prAssigneeStore := postgres.NewPullRequestAssigneeStore(db)
	prUseCase := usecase.NewPullRequestService(dbPRAdapter, dbCollabAdapter,
		gitAdapter, dbRepoAdapter, dbUserAdapter, prLabelStore, prAssigneeStore)

	// 4. Initialize delivery/handlers (injecting the usecases)
	repoHandler := httpHandler.NewRepoHandler(repoUseCase, publicBaseURL)
	authHandler := httpHandler.NewAuthHandler(authUseCase)
	collabHandler := httpHandler.NewCollaboratorHandler(collabUseCase)
	issueHandler := httpHandler.NewIssueHandler(issueUseCase)
	labelHandler := httpHandler.NewLabelHandler(labelUseCase)
	starHandler := httpHandler.NewStarHandler(starUseCase)
	prHandler := httpHandler.NewPullRequestHandler(prUseCase)
	prLabelHandler := httpHandler.NewPRLabelHandler(prUseCase)
	userService := usecase.NewUserService(dbUserAdapter, tokenManager, gitAdapter)
	userSettingsHandler := httpHandler.NewUserSettingsHandler(userService)
	repoInsightsHandler := httpHandler.NewRepoInsightsHandler(repoInsightUseCase)

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
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// Auth routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Repo routes secured with JWT
		repos := v1.Group("/repos")
		repos.Use(middleware.AuthMiddleware(jwtSecret))

		// User settings routes secured with JWT
		userSettings := v1.Group("/user")
		userSettings.Use(middleware.AuthMiddleware(jwtSecret))
		{
			userSettings.PATCH("/username", userSettingsHandler.HandleChangeUsername)
		}

		{
			// Repo routes
			repos.POST("", repoHandler.HandleCreateRepo)
			repos.GET("", repoHandler.HandleGetRepos)
			repos.GET("/count", repoHandler.HandleGetOwnedRepoCount)
			repos.PATCH("/:repo_id/visibility", repoHandler.HandleUpdateRepoVisibility)
			repos.PATCH("/:repo_id/name", repoHandler.HandleRenameRepo)
			repos.PATCH("/:repo_id/details", repoHandler.HandleUpdateRepoDetails)
			repos.DELETE("/:repo_id", repoHandler.HandleDeleteRepo)
			repos.POST("/:repo_id/branches", repoHandler.HandleCreateBranch)
			repos.PATCH("/:repo_id/branches", repoHandler.HandleRenameBranch)
			repos.GET("/:repo_id/branches", repoHandler.HandleGetBranches)
			repos.DELETE("/:repo_id/branches/:branchName", repoHandler.HandleDeleteBranch)
			repos.GET("/:repo_id/tree", repoHandler.HandleGetTree)
			repos.GET("/:repo_id/blob", repoHandler.HandleGetBlob)
			repos.GET("/:repo_id/commits", repoHandler.HandleGetCommits)
			repos.GET("/:repo_id/commits/stats", repoHandler.HandleGetCommitStats)
			repos.POST("/:repo_id/commits-batch", repoHandler.HandleGetCommitsBatch)
			repos.GET("/:repo_id/commits/:commitHash", repoHandler.HandleGetCommitDetail)
			repos.GET("/:repo_id/commits/:commitHash/diff", repoHandler.HandleGetCommitDiff)
			repos.POST("/:repo_id/commit-file", repoHandler.HandleCommitFileChange)
			repos.POST("/:repo_id/commit-files", repoHandler.HandleCommitFilesChange)
			repos.DELETE("/:repo_id/contents", repoHandler.HandleDeletePath)
			repos.GET("/:repo_id/insights", repoInsightsHandler.HandleGetLatestInsights)
			repos.POST("/:repo_id/insights/recompute", repoInsightsHandler.HandleTriggerRecompute)

			// Collab routes
			repos.POST("/:repo_id/collabs", collabHandler.HandleAddCollaborator)
			repos.GET("/:repo_id/collabs", collabHandler.HandleGetCollaborators)
			repos.DELETE("/:repo_id/collabs/:user_id", collabHandler.HandleRemoveCollaborator)

			// Pull request routes
			repos.GET("/:repo_id/compare", prHandler.HandleComparePullRequestRefs)
			repos.POST("/:repo_id/pulls", prHandler.HandleCreatePullRequest)
			repos.GET("/:repo_id/pulls", prHandler.HandleListPullRequests)
			repos.GET("/:repo_id/pulls/:pull_id", prHandler.HandleGetPullRequest)
			repos.GET("/:repo_id/pulls/:pull_id/events", prHandler.HandleListPullRequestEvents)
			repos.POST("/:repo_id/pulls/:pull_id/merge", prHandler.HandleMergePullRequest)
			repos.POST("/:repo_id/pulls/:pull_id/revert", prHandler.HandleRevertPullRequest)
			repos.POST("/:repo_id/pulls/:pull_id/close", prHandler.HandleClosePullRequest)
			repos.POST("/:repo_id/pulls/:pull_id/reopen", prHandler.HandleReopenPullRequest)

			// PR labels & assignees
			repos.GET("/:repo_id/pulls/:pull_id/labels", prLabelHandler.HandleListLabels)
			repos.POST("/:repo_id/pulls/:pull_id/labels", prLabelHandler.HandleAddLabel)
			repos.DELETE("/:repo_id/pulls/:pull_id/labels/:label_id", prLabelHandler.HandleRemoveLabel)
			repos.GET("/:repo_id/pulls/:pull_id/assignees", prLabelHandler.HandleListAssignees)
			repos.POST("/:repo_id/pulls/:pull_id/assignees", prLabelHandler.HandleAssignUser)
			repos.DELETE("/:repo_id/pulls/:pull_id/assignees/:user_id", prLabelHandler.HandleUnassignUser)

			// Issue routes
			repos.POST("/:repo_id/issues", issueHandler.HandleCreateIssue)
			repos.GET("/:repo_id/issues", issueHandler.HandleListIssues)
			repos.GET("/:repo_id/issues/:issue_id", issueHandler.HandleGetIssue)
			repos.PATCH("/:repo_id/issues/:issue_id/status", issueHandler.HandleUpdateIssueStatus)
			repos.GET("/:repo_id/issues/:issue_id/assignees", issueHandler.HandleListIssueAssignees)
			repos.GET("/:repo_id/issues/:issue_id/events", issueHandler.HandleListIssueEvents)
			repos.GET("/:repo_id/issues/:issue_id/comments", issueHandler.HandleListIssueComments)
			repos.POST("/:repo_id/issues/:issue_id/comments", issueHandler.HandleCreateIssueComment)
			repos.POST("/:repo_id/issues/:issue_id/assignees", issueHandler.HandleAssignIssue)
			repos.DELETE("/:repo_id/issues/:issue_id/assignees/:user_id", issueHandler.HandleUnassignIssue)

			// Label routes
			repos.GET("/:repo_id/labels", labelHandler.HandleListLabels)
			repos.GET("/:repo_id/issues/:issue_id/labels", labelHandler.HandleListIssueLabels)
			repos.POST("/:repo_id/issues/:issue_id/labels", labelHandler.HandleAddLabelToIssue)
			repos.DELETE("/:repo_id/issues/:issue_id/labels/:label_id", labelHandler.HandleRemoveLabelFromIssue)

			// Star routes
			repos.GET("/:repo_id/star", starHandler.HandleGetStarStatus)
			repos.POST("/:repo_id/star", starHandler.HandleStarRepo)
			repos.DELETE("/:repo_id/star", starHandler.HandleUnstarRepo)

			// Resolve conflicts routes
			repos.GET("/:repo_id/pulls/:pull_id/conflicts", prHandler.HandleGetMergeConflicts)
			repos.POST("/:repo_id/pulls/:pull_id/conflicts/resolve", prHandler.HandleResolveConflicts)
		}

		profile := v1.Group("/profile")
		profile.Use(middleware.AuthMiddleware(jwtSecret))
		{
			profile.GET("/activity", repoInsightsHandler.HandleGetProfileActivity)
			profile.GET("/starred/count", starHandler.HandleCountStarred)
			profile.GET("/starred", starHandler.HandleListStarred)
		}
	}

	// 6. Start the server
	fmt.Printf("Synergit backend running on port %s...\n", port)
	log.Fatal(router.Run(":" + port))
}
