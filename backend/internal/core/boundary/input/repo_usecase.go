package input

import (
	"synergit/internal/core/boundary/output"
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type RepoUseCase interface {
	CreateRepository(name string, ownerID uuid.UUID) (*domain.Repo, error)
	CreateRepositoryWithOptions(name string, ownerID uuid.UUID, options domain.CreateRepositoryOptions) (*domain.Repo, error)
	GetIntoRefs(repoID uuid.UUID, service string) ([]byte, error)
	GetIntoRefsByOwnerAndName(ownerUsername string, repoName string, service string) ([]byte, error)
	UploadPack(repoID uuid.UUID, requestPayload output.ByteReader,
		responseWriter output.ByteWriter) error
	UploadPackByOwnerAndName(ownerUsername string, repoName string,
		requestPayload output.ByteReader, responseWriter output.ByteWriter) error
	ReceivePack(repoID uuid.UUID, requestPayload output.ByteReader,
		responseWriter output.ByteWriter) error
	ReceivePackByOwnerAndName(ownerUsername string, repoName string,
		requestPayload output.ByteReader, responseWriter output.ByteWriter) error
	GetAllRepositories(requesterID uuid.UUID) ([]*domain.Repo, error)
	CountOwnedRepositories(requesterID uuid.UUID) (int, error)
	UpdateRepositoryVisibility(repoID uuid.UUID, requesterID uuid.UUID,
		visibility domain.RepoVisibility) (*domain.Repo, error)
	RenameRepository(repoID uuid.UUID, requesterID uuid.UUID,
		newName string) (*domain.Repo, error)
	DeleteRepository(repoID uuid.UUID, requesterID uuid.UUID) error
	GetRepoTree(repoID uuid.UUID, path string, branch string) ([]domain.RepoFile, error)
	GetRepoBlob(repoID uuid.UUID, path string, branch string) (string, error)
	GetRepoCommits(repoID uuid.UUID, branch string, path string) ([]domain.Commit, error)
	GetRepoCommitsBatch(repoID uuid.UUID, branch string, paths []string) (map[string]*domain.Commit, error)
	GetCommitDetail(repoID uuid.UUID, commitHash string) (*domain.Commit, error)
	GetCommitDiff(repoID uuid.UUID, commitHash string) ([]domain.DiffFile, error)
	GetRepoBranches(repoID uuid.UUID) ([]domain.Branch, error)
	CreateRepoBranch(repoID uuid.UUID, newBranch string, fromBranch string) (*domain.Branch, error)
	RenameRepoBranch(repoID uuid.UUID, oldBranch string, newBranch string) (*domain.Branch, error)
	DeleteRepoBranch(repoID uuid.UUID, branchName string) error
	CommitFileChange(repoID uuid.UUID, requesterID uuid.UUID,
		branch string, filePath string, oldFilePath string, content string, commitMessage string) error
	CommitFilesChange(repoID uuid.UUID, requesterID uuid.UUID,
		branch string, files map[string]string, commitMessage string) error
	DeletePath(repoID uuid.UUID, requesterID uuid.UUID, branch string, path string, commitMessage string) error
}
