package http

import (
	"fmt"
	"net/http"
	"synergit/internal/core/usecase"

	"github.com/gin-gonic/gin"
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

func (h *RepoHandler) HandleCreateRepo(c *gin.Context) {
	var req CreateRepoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	// Call the business logic
	repo, err := h.repoUsecase.CreateRepository(req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Gin handles writing the JSON response and headers
	c.JSON(http.StatusCreated, repo)
}

func (h *RepoHandler) HandleInfoRefs(c *gin.Context) {
	repoName := c.Param("name")
	service := c.Query("service")

	if service == "" {
		c.String(http.StatusBadRequest, "service query parameter is requiered")
	}

	refs, err := h.repoUsecase.GetIntoRefs(repoName, service)
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}

	// 1. Set specific Git headers
	c.Header("Content-Type", fmt.Sprintf("application/x-%s-advertisement", service))
	c.Header("Cache-Control", "no-cache")

	// 2. Git smart http requires a specific hex-encoded packet line first
	packetStr := fmt.Sprintf("# service=%s\n", service)
	packetLen := fmt.Sprintf("%04x", len(packetStr)+4) // length includes the 4 bytes of the hex string inself

	c.Writer.Write([]byte(packetLen + packetStr + "0000"))

	// 3. Write the actual Git references
	c.Writer.Write(refs)
}

// HandleUploadPack handles POST /:name/git-upload-pack
func (h *RepoHandler) HandleUploadPack(c *gin.Context) {
	repoName := c.Param("name")

	c.Header("Content-Type", "application/x-git-upload-pack-result")
	c.Header("Cache-Control", "no-cache")

	// Pass the HTTP Request Body and Response Writer directly to the usecase
	err := h.repoUsecase.UploadPack(repoName, c.Request.Body, c.Writer)
	if err != nil {
		fmt.Printf("Error uploading pack: %v\n", err)
		// Don't write HTTP errors here, Git is already streaming the response
	}
}

func (h *RepoHandler) HandleReceivePack(c *gin.Context) {
	repoName := c.Param("name")

	// Git requires this specific content type for pushes
	c.Header("Content-Type", "application/x-git-receive-pack-result")
	c.Header("Cache-Control", "no-cache")

	err := h.repoUsecase.ReceivePack(repoName, c.Request.Body, c.Writer)
	if err != nil {
		fmt.Printf("Error receiving pack: %v\n", err)
	}
}

func (h *RepoHandler) HandleGetRepos(c *gin.Context) {
	repos, err := h.repoUsecase.GetAllRepositories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch repositories"})
		return
	}

	c.JSON(http.StatusOK, repos)
}
