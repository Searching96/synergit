package middleware

import (
	"encoding/base64"
	"net/http"
	"strings"

	"synergit/internal/core/boundary/output"
	"synergit/internal/core/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GitAuthMiddleware(
	userStore output.UserRepository,
	repoStore output.RepoRepository,
	collabStore output.CollaboratorRepository,
	hasher output.PasswordHasher,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		ownerParam := c.Param("username")
		repoGitParam := c.Param("repo_git")

		if ownerParam == "" || repoGitParam == "" {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		// Ensure .git suffix
		repoName := repoGitParam
		if strings.HasSuffix(repoName, ".git") {
			repoName = strings.TrimSuffix(repoName, ".git")
		} else {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		// Determine operation type
		// GET /info/refs?service=git-receive-pack -> WRITE
		// POST /git-receive-pack -> WRITE
		// GET /info/refs?service=git-upload-pack -> READ
		// POST /git-upload-pack -> READ
		isWrite := false
		if strings.HasSuffix(c.Request.URL.Path, "/git-receive-pack") {
			isWrite = true
		} else if strings.HasSuffix(c.Request.URL.Path, "/info/refs") {
			service := c.Query("service")
			if service == "git-receive-pack" {
				isWrite = true
			}
		}

		// Fetch repository
		repo, err := repoStore.FindByOwnerAndName(ownerParam, repoName)
		if err != nil || repo == nil {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}

		authRequired := isWrite || repo.Visibility == domain.RepoVisibilityPrivate

		if !authRequired {
			c.Next()
			return
		}

		// Authentication required
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Header("WWW-Authenticate", `Basic realm="Synergit Git Access"`)
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Basic" {
			c.Header("WWW-Authenticate", `Basic realm="Synergit Git Access"`)
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		decoded, err := base64.StdEncoding.DecodeString(parts[1])
		if err != nil {
			c.Header("WWW-Authenticate", `Basic realm="Synergit Git Access"`)
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		creds := strings.SplitN(string(decoded), ":", 2)
		if len(creds) != 2 {
			c.Header("WWW-Authenticate", `Basic realm="Synergit Git Access"`)
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		username := creds[0]
		password := creds[1]

		user, err := userStore.GetUserByUserName(username)
		if err != nil || user == nil {
			c.Header("WWW-Authenticate", `Basic realm="Synergit Git Access"`)
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		if err := hasher.Compare(user.PasswordHash, password); err != nil {
			c.Header("WWW-Authenticate", `Basic realm="Synergit Git Access"`)
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		// Authorization
		isAuthorized := false

		// 1. Is Owner?
		if repo.Owner == user.Username {
			isAuthorized = true
		} else {
			// 2. Is Collaborator?
			// parse ID strings
			repoUUID, _ := uuid.Parse(repo.ID)
			userUUID, _ := uuid.Parse(user.ID)

			role, err := collabStore.GetRole(repoUUID, userUUID)
			if err == nil && role != "" {
				// Has some role, assume authorized for now (all collaborators have write access)
				isAuthorized = true
			}
		}

		if !isAuthorized {
			if repo.Visibility == domain.RepoVisibilityPrivate {
				c.AbortWithStatus(http.StatusNotFound) // Hide existence
			} else {
				c.AbortWithStatus(http.StatusForbidden)
			}
			return
		}

		// Set context
		c.Set("user_id", user.ID)
		c.Set("username", user.Username)

		c.Next()
	}
}
