package usecase

import (
	"errors"
	"synergit/internal/core/boundary/output"
	"synergit/internal/core/domain"
	"time"

	"github.com/google/uuid"
)

type ProjectService struct {
	projectStore output.ProjectRepository
}

func NewProjectService(projectStore output.ProjectRepository) *ProjectService {
	return &ProjectService{
		projectStore: projectStore,
	}
}

func (s *ProjectService) CreateProject(ownerID uuid.UUID, payload *domain.CreateProjectPayload) (*domain.Project, error) {
	project := &domain.Project{
		ID:          uuid.New(),
		OwnerID:     ownerID,
		Title:       payload.Title,
		Description: payload.Description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.projectStore.CreateProject(project); err != nil {
		return nil, err
	}

	// Create default views
	defaultViews := []domain.ProjectView{
		{
			ID:        uuid.New(),
			ProjectID: project.ID,
			Name:      "Table 1",
			Layout:    domain.ProjectViewTable,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        uuid.New(),
			ProjectID: project.ID,
			Name:      "Board 1",
			Layout:    domain.ProjectViewBoard,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        uuid.New(),
			ProjectID: project.ID,
			Name:      "Roadmap 1",
			Layout:    domain.ProjectViewRoadmap,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	for _, view := range defaultViews {
		if err := s.projectStore.CreateView(&view); err != nil {
			// Log error, but don't fail project creation
		}
	}

	return project, nil
}

func (s *ProjectService) GetProjectByID(id uuid.UUID) (*domain.Project, error) {
	project, err := s.projectStore.GetProjectByID(id)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}
	return project, nil
}

func (s *ProjectService) GetProjectByNumber(ownerID uuid.UUID, number int) (*domain.Project, error) {
	project, err := s.projectStore.GetProjectByNumber(ownerID, number)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}
	return project, nil
}

func (s *ProjectService) ListProjectsByOwner(ownerID uuid.UUID) ([]domain.Project, error) {
	return s.projectStore.ListProjectsByOwner(ownerID)
}

func (s *ProjectService) UpdateProject(id uuid.UUID, payload *domain.UpdateProjectPayload) (*domain.Project, error) {
	project, err := s.GetProjectByID(id)
	if err != nil {
		return nil, err
	}

	project.Title = payload.Title
	project.Description = payload.Description
	project.UpdatedAt = time.Now()

	if err := s.projectStore.UpdateProject(project); err != nil {
		return nil, err
	}

	return project, nil
}

func (s *ProjectService) DeleteProject(id uuid.UUID) error {
	return s.projectStore.DeleteProject(id)
}

// Project View Operations

func (s *ProjectService) CreateView(projectID uuid.UUID, payload *domain.CreateProjectViewPayload) (*domain.ProjectView, error) {
	if err := payload.Validate(); err != nil {
		return nil, err
	}

	view := &domain.ProjectView{
		ID:        uuid.New(),
		ProjectID: projectID,
		Name:      payload.Name,
		Layout:    domain.ProjectViewLayout(payload.Layout),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.projectStore.CreateView(view); err != nil {
		return nil, err
	}

	return view, nil
}

func (s *ProjectService) ListViews(projectID uuid.UUID) ([]domain.ProjectView, error) {
	return s.projectStore.ListViewsByProject(projectID)
}

func (s *ProjectService) UpdateView(viewID uuid.UUID, payload *domain.CreateProjectViewPayload) (*domain.ProjectView, error) {
	if err := payload.Validate(); err != nil {
		return nil, err
	}

	view, err := s.projectStore.GetViewById(viewID)
	if err != nil {
		return nil, err
	}
	if view == nil {
		return nil, errors.New("view not found")
	}

	view.Name = payload.Name
	view.Layout = domain.ProjectViewLayout(payload.Layout)
	view.UpdatedAt = time.Now()

	if err := s.projectStore.UpdateView(view); err != nil {
		return nil, err
	}

	return view, nil
}

func (s *ProjectService) DeleteView(viewID uuid.UUID) error {
	return s.projectStore.DeleteView(viewID)
}

// Project Item Operations

func (s *ProjectService) AddItem(projectID uuid.UUID, payload *domain.CreateProjectItemPayload) (*domain.ProjectItem, error) {
	if err := payload.Validate(); err != nil {
		return nil, err
	}

	status := payload.Status
	if status == "" {
		status = "Todo" // Default status
	}

	item := &domain.ProjectItem{
		ID:          uuid.New(),
		ProjectID:   projectID,
		ContentType: domain.ProjectItemContentType(payload.ContentType),
		ContentID:   payload.ContentID,
		Status:      status,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.projectStore.AddItem(item); err != nil {
		return nil, err
	}

	return item, nil
}

func (s *ProjectService) ListItems(projectID uuid.UUID) ([]domain.ProjectItemDTO, error) {
	return s.projectStore.ListItemsByProject(projectID)
}

func (s *ProjectService) UpdateItem(itemID uuid.UUID, payload *domain.UpdateProjectItemPayload) (*domain.ProjectItem, error) {
	item, err := s.projectStore.GetItemById(itemID)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, errors.New("item not found")
	}

	if payload.Status != nil {
		item.Status = *payload.Status
	}
	if payload.StartDate != nil {
		item.StartDate = payload.StartDate
	}
	if payload.TargetDate != nil {
		item.TargetDate = payload.TargetDate
	}
	item.UpdatedAt = time.Now()

	if err := s.projectStore.UpdateItem(item); err != nil {
		return nil, err
	}

	return item, nil
}

func (s *ProjectService) DeleteItem(itemID uuid.UUID) error {
	return s.projectStore.DeleteItem(itemID)
}
