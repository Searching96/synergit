package http

import (
	"net/http"
	"synergit/internal/adapter/controller/dto"
	"synergit/internal/core/boundary/input"
	"synergit/internal/core/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ProjectHandler struct {
	projectUseCase input.ProjectUseCase
}

func NewProjectHandler(uc input.ProjectUseCase) *ProjectHandler {
	return &ProjectHandler{projectUseCase: uc}
}

func parseProjectID(c *gin.Context) (uuid.UUID, bool) {
	projectID, err := uuid.Parse(c.Param("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid project_id format"})
		return uuid.Nil, false
	}
	return projectID, true
}

func parseViewID(c *gin.Context) (uuid.UUID, bool) {
	viewID, err := uuid.Parse(c.Param("view_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid view_id format"})
		return uuid.Nil, false
	}
	return viewID, true
}

func parseItemID(c *gin.Context) (uuid.UUID, bool) {
	itemID, err := uuid.Parse(c.Param("item_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: "invalid item_id format"})
		return uuid.Nil, false
	}
	return itemID, true
}

// HandleCreateProject creates a new user project
func (h *ProjectHandler) HandleCreateProject(c *gin.Context) {
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	var req domain.CreateProjectPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	project, err := h.projectUseCase.CreateProject(requesterID, &req)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, project)
}

// HandleListProjects gets all projects for the authenticated user
func (h *ProjectHandler) HandleListProjects(c *gin.Context) {
	requesterID, ok := parseRequesterID(c)
	if !ok {
		return
	}

	projects, err := h.projectUseCase.ListProjectsByOwner(requesterID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, projects)
}

// HandleGetProject gets a single project
func (h *ProjectHandler) HandleGetProject(c *gin.Context) {
	projectID, ok := parseProjectID(c)
	if !ok {
		return
	}

	project, err := h.projectUseCase.GetProjectByID(projectID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, project)
}

// HandleUpdateProject updates project title/description
func (h *ProjectHandler) HandleUpdateProject(c *gin.Context) {
	projectID, ok := parseProjectID(c)
	if !ok {
		return
	}

	var req domain.UpdateProjectPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	project, err := h.projectUseCase.UpdateProject(projectID, &req)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, project)
}

// HandleDeleteProject deletes a project
func (h *ProjectHandler) HandleDeleteProject(c *gin.Context) {
	projectID, ok := parseProjectID(c)
	if !ok {
		return
	}

	err := h.projectUseCase.DeleteProject(projectID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "Project deleted successfully"})
}

// HandleCreateView creates a new view for a project
func (h *ProjectHandler) HandleCreateView(c *gin.Context) {
	projectID, ok := parseProjectID(c)
	if !ok {
		return
	}

	var req domain.CreateProjectViewPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	view, err := h.projectUseCase.CreateView(projectID, &req)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, view)
}

// HandleListViews lists all views for a project
func (h *ProjectHandler) HandleListViews(c *gin.Context) {
	projectID, ok := parseProjectID(c)
	if !ok {
		return
	}

	views, err := h.projectUseCase.ListViews(projectID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, views)
}

// HandleUpdateView updates a view's name or layout
func (h *ProjectHandler) HandleUpdateView(c *gin.Context) {
	viewID, ok := parseViewID(c)
	if !ok {
		return
	}

	var req domain.CreateProjectViewPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	view, err := h.projectUseCase.UpdateView(viewID, &req)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, view)
}

// HandleDeleteView deletes a view
func (h *ProjectHandler) HandleDeleteView(c *gin.Context) {
	viewID, ok := parseViewID(c)
	if !ok {
		return
	}

	err := h.projectUseCase.DeleteView(viewID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "View deleted successfully"})
}

// HandleAddItem adds an item to a project
func (h *ProjectHandler) HandleAddItem(c *gin.Context) {
	projectID, ok := parseProjectID(c)
	if !ok {
		return
	}

	var req domain.CreateProjectItemPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	item, err := h.projectUseCase.AddItem(projectID, &req)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, item)
}

// HandleListItems lists all items in a project
func (h *ProjectHandler) HandleListItems(c *gin.Context) {
	projectID, ok := parseProjectID(c)
	if !ok {
		return
	}

	items, err := h.projectUseCase.ListItems(projectID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, items)
}

// HandleUpdateItem updates an item
func (h *ProjectHandler) HandleUpdateItem(c *gin.Context) {
	itemID, ok := parseItemID(c)
	if !ok {
		return
	}

	var req domain.UpdateProjectItemPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{Error: err.Error()})
		return
	}

	item, err := h.projectUseCase.UpdateItem(itemID, &req)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, item)
}

// HandleDeleteItem deletes an item
func (h *ProjectHandler) HandleDeleteItem(c *gin.Context) {
	itemID, ok := parseItemID(c)
	if !ok {
		return
	}

	err := h.projectUseCase.DeleteItem(itemID)
	if err != nil {
		respondUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{Message: "Item deleted successfully"})
}
