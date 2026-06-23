package input

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type ProjectUseCase interface {
	CreateProject(ownerID uuid.UUID, payload *domain.CreateProjectPayload) (*domain.Project, error)
	GetProjectByID(id uuid.UUID) (*domain.Project, error)
	GetProjectByNumber(ownerID uuid.UUID, number int) (*domain.Project, error)
	ListProjectsByOwner(ownerID uuid.UUID) ([]domain.Project, error)
	UpdateProject(id uuid.UUID, payload *domain.UpdateProjectPayload) (*domain.Project, error)
	DeleteProject(id uuid.UUID) error

	CreateView(projectID uuid.UUID, payload *domain.CreateProjectViewPayload) (*domain.ProjectView, error)
	ListViews(projectID uuid.UUID) ([]domain.ProjectView, error)
	UpdateView(viewID uuid.UUID, payload *domain.CreateProjectViewPayload) (*domain.ProjectView, error)
	DeleteView(viewID uuid.UUID) error

	AddItem(projectID uuid.UUID, payload *domain.CreateProjectItemPayload) (*domain.ProjectItem, error)
	ListItems(projectID uuid.UUID) ([]domain.ProjectItemDTO, error)
	UpdateItem(itemID uuid.UUID, payload *domain.UpdateProjectItemPayload) (*domain.ProjectItem, error)
	DeleteItem(itemID uuid.UUID) error
}
