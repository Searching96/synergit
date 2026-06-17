package domain

import (
	"time"

	"github.com/google/uuid"
)

type EventType string

const (
	EventTypeDirectPush      EventType = "direct_push"
	EventTypePRMerge         EventType = "pr_merge"
	EventTypeBranchCreation  EventType = "branch_creation"
	EventTypeBranchDeletion  EventType = "branch_deletion"
	EventTypeForcePush       EventType = "force_push"
	EventTypeMergeQueueMerge EventType = "merge_queue_merge"
)

type RepoEvent struct {
	ID        uuid.UUID `json:"id"`
	RepoID    uuid.UUID `json:"repo_id"`
	ActorID   uuid.UUID `json:"actor_id"`
	EventType EventType `json:"event_type"`
	Payload   string    `json:"payload"`
	CreatedAt time.Time `json:"created_at"`

	// Relationships
	Actor *User `json:"actor,omitempty"`
}
