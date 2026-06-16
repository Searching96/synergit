package output

import (
	"github.com/google/uuid"
)

type WatcherRepository interface {
	Watch(userID uuid.UUID, repoID uuid.UUID) error
	Unwatch(userID uuid.UUID, repoID uuid.UUID) error
	IsWatched(userID uuid.UUID, repoID uuid.UUID) (bool, error)
	CountForRepo(repoID uuid.UUID) (int, error)
}

type WatcherUseCase interface {
	Watch(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error)
	Unwatch(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error)
	GetStatus(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error)
}
