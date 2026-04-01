package http

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"synergit/internal/adapter/handler/http/dto"
	"synergit/internal/core/port"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RepoHandler struct {
	repoUsecase port.RepoUsecase
}

func NewRepoHandler(uc port.RepoUsecase) *RepoHandler {
	return &RepoHandler{
		repoUsecase: uc,
	}
}

func parseRepoID(c *gin.Context) (uuid.UUID, bool) {
	repoID, err := uuid.Parse(c.Param("repo_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid repo_id format"})
		return uuid.Nil, false
	}
	return repoID, true
}

func parseCloneCoordinates(c *gin.Context) (string, string, bool) {
	owner := c.Param("username")
	repo := c.Param("repo_git")
	if repo == "" {
		repo = c.Param("repo")
	}
	repo = strings.TrimSuffix(repo, ".git")
	if owner == "" || repo == "" {
		c.String(http.StatusBadRequest, "invalid clone URL")
		return "", "", false
	}

	return owner, repo, true
}

func (h *RepoHandler) HandleCreateRepo(c *gin.Context) {
	var req dto.CreateRepoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "Invalid request payload: " + err.Error()})
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "repository name is required"})
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	// Call the business logic
	repo, err := h.repoUsecase.CreateRepository(req.Name, requesterID)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	// Gin handles writing the JSON response and headers
	c.JSON(http.StatusCreated, repo)
}

// Deprecated: use HandleInfoRefsPublic (/:username/:repo.git/info/refs).
func (h *RepoHandler) HandleInfoRefs(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}
	service := c.Query("service")

	if service == "" {
		c.String(http.StatusBadRequest, "service query parameter is requiered")
		return
	}

	refs, err := h.repoUsecase.GetIntoRefs(repoID, service)
	if err != nil {
		c.String(statusFromUsecaseError(err), err.Error())
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

// Deprecated: repo_id receive-pack path is legacy and not publicly exposed.
func (h *RepoHandler) HandleReceivePack(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	// Git requires this specific content type for pushes
	c.Header("Content-Type", "application/x-git-receive-pack-result")
	c.Header("Cache-Control", "no-cache")

	requestPayload, readErr := io.ReadAll(c.Request.Body)
	if readErr != nil {
		c.String(http.StatusBadRequest, "failed to read git request payload")
		return
	}

	responsePayload, err := h.repoUsecase.ReceivePack(repoID, requestPayload)
	if err != nil {
		fmt.Printf("Error receiving pack: %v\n", err)
		c.String(statusFromUsecaseError(err), err.Error())
		return
	}

	_, _ = c.Writer.Write(responsePayload)
}

// Deprecated: use HandleUploadPackPublic (/:username/:repo.git/git-upload-pack).
// HandleUploadPack handles POST /:repo_id/git-upload-pack
func (h *RepoHandler) HandleUploadPack(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	c.Header("Content-Type", "application/x-git-upload-pack-result")
	c.Header("Cache-Control", "no-cache")

	// Pass the HTTP Request Body and Response Writer directly to the usecase
	requestPayload, readErr := io.ReadAll(c.Request.Body)
	if readErr != nil {
		c.String(http.StatusBadRequest, "failed to read git request payload")
		return
	}

	responsePayload, err := h.repoUsecase.UploadPack(repoID, requestPayload)
	if err != nil {
		fmt.Printf("Error uploading pack: %v\n", err)
		c.String(statusFromUsecaseError(err), err.Error())
		return
	}

	_, _ = c.Writer.Write(responsePayload)
}

func (h *RepoHandler) HandleInfoRefsPublic(c *gin.Context) {
	owner, repo, ok := parseCloneCoordinates(c)
	if !ok {
		return
	}

	service := c.Query("service")
	if service == "" {
		c.String(http.StatusBadRequest, "service query parameter is requiered")
		return
	}

	refs, err := h.repoUsecase.GetIntoRefsByOwnerAndName(owner, repo, service)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}

	c.Header("Content-Type", fmt.Sprintf("application/x-%s-advertisement", service))
	c.Header("Cache-Control", "no-cache")

	packetStr := fmt.Sprintf("# service=%s\n", service)
	packetLen := fmt.Sprintf("%04x", len(packetStr)+4)

	c.Writer.Write([]byte(packetLen + packetStr + "0000"))
	c.Writer.Write(refs)
}

func (h *RepoHandler) HandleUploadPackPublic(c *gin.Context) {
	owner, repo, ok := parseCloneCoordinates(c)
	if !ok {
		return
	}

	c.Header("Content-Type", "application/x-git-upload-pack-result")
	c.Header("Cache-Control", "no-cache")

	requestPayload, readErr := io.ReadAll(c.Request.Body)
	if readErr != nil {
		c.String(http.StatusBadRequest, "failed to read git request payload")
		return
	}

	responsePayload, err := h.repoUsecase.UploadPackByOwnerAndName(owner, repo,
		requestPayload)
	if err != nil {
		fmt.Printf("Error uploading pack: %v\n", err)
		c.String(statusFromUsecaseError(err), err.Error())
		return
	}

	_, _ = c.Writer.Write(responsePayload)
}

func (h *RepoHandler) HandleReceivePackPublic(c *gin.Context) {
	owner, repo, ok := parseCloneCoordinates(c)
	if !ok {
		return
	}

	c.Header("Content-Type", "application/x-git-receive-pack-result")
	c.Header("Cache-Control", "no-cache")

	requestPayload, readErr := io.ReadAll(c.Request.Body)
	if readErr != nil {
		c.String(http.StatusBadRequest, "failed to read git request payload")
		return
	}

	responsePayload, err := h.repoUsecase.ReceivePackByOwnerAndName(owner, repo,
		requestPayload)
	if err != nil {
		fmt.Printf("Error receiving pack: %v\n", err)
		c.String(statusFromUsecaseError(err), err.Error())
		return
	}

	_, _ = c.Writer.Write(responsePayload)
}

func (h *RepoHandler) HandleGetRepos(c *gin.Context) {
	repos, err := h.repoUsecase.GetAllRepositories()
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, repos)
}

func (h *RepoHandler) HandleGetTree(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	// Get the path query parameter. If it doesn't exist, it defaults to "" (root)
	path := c.Query("path")
	branch := c.Query("branch")

	files, err := h.repoUsecase.GetRepoTree(repoID, path, branch)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, files)
}

func (h *RepoHandler) HandleGetBlob(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}
	path := c.Query("path")
	branch := c.Query("branch")

	content, err := h.repoUsecase.GetRepoBlob(repoID, path, branch)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, content)
}

func (h *RepoHandler) HandleGetCommits(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}
	branch := c.Query("branch")

	commits, err := h.repoUsecase.GetRepoCommits(repoID, branch)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, commits)
}

func (h *RepoHandler) HandleGetBranches(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}
	branches, err := h.repoUsecase.GetRepoBranches(repoID)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}
	c.JSON(http.StatusOK, branches)
}

func (h *RepoHandler) HandleCreateBranch(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	var req dto.CreateBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "Invalid request payload: " + err.Error()})
		return
	}

	if strings.TrimSpace(req.Name) == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "branch name is required"})
		return
	}

	branch, err := h.repoUsecase.CreateRepoBranch(repoID, req.Name, req.FromBranch)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, branch)
}

func (h *RepoHandler) HandleCommitFileChange(c *gin.Context) {
	repoID, ok := parseRepoID(c)
	if !ok {
		return
	}

	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req dto.CommitFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "Invalid request payload: " + err.Error()})
		return
	}

	if strings.TrimSpace(req.Branch) == "" || strings.TrimSpace(req.Path) == "" ||
		strings.TrimSpace(req.CommitMessage) == "" {

		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "branch, path, and commit_message are required"})
		return
	}

	err := h.repoUsecase.CommitFileChange(repoID, requesterID, req.Branch,
		req.Path, req.Content, req.CommitMessage)
	if err != nil {
		respondUsecaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "file committed successfully"})
}
