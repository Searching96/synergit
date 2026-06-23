package output

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type ProjectRepository interface {
	CreateProject(project *domain.Project) error
	GetProjectByID(id uuid.UUID) (*domain.Project, error)
	GetProjectByNumber(ownerID uuid.UUID, number int) (*domain.Project, error)
	ListProjectsByOwner(ownerID uuid.UUID) ([]domain.Project, error)
	UpdateProject(project *domain.Project) error
	DeleteProject(id uuid.UUID) error

	CreateView(view *domain.ProjectView) error
	GetViewById(id uuid.UUID) (*domain.ProjectView, error)
	ListViewsByProject(projectID uuid.UUID) ([]domain.ProjectView, error)
	UpdateView(view *domain.ProjectView) error
	DeleteView(id uuid.UUID) error

	AddItem(item *domain.ProjectItem) error
	GetItemById(id uuid.UUID) (*domain.ProjectItem, error)
	ListItemsByProject(projectID uuid.UUID) ([]domain.ProjectItemDTO, error)
	UpdateItem(item *domain.ProjectItem) error
	DeleteItem(id uuid.UUID) error
}
