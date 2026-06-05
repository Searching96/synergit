package dto

// CreateRepoRequest defines payload for creating a repository.
type CreateRepoRequest struct {
	Name              string `json:"name"`
	Description       string `json:"description"`
	Visibility        string `json:"visibility"`
	InitializeReadme  bool   `json:"initialize_readme"`
	GitignoreTemplate string `json:"gitignore_template"`
	LicenseTemplate   string `json:"license_template"`
}

// CreateBranchRequest defines payload for creating a branch.
type CreateBranchRequest struct {
	Name       string `json:"name"`
	FromBranch string `json:"from_branch"`
}

// RenameBranchRequest defines payload for renaming a branch.
type RenameBranchRequest struct {
	OldName string `json:"old_name"`
	NewName string `json:"new_name"`
}

type UpdateRepoVisibilityRequest struct {
	Visibility string `json:"visibility"`
}

type CommitFileRequest struct {
	Branch        string `json:"branch"`
	Path          string `json:"path"`
	Content       string `json:"content"`
	CommitMessage string `json:"commit_message"`
}

type CommitFileEntryRequest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type CommitFilesRequest struct {
	Branch        string                   `json:"branch"`
	Files         []CommitFileEntryRequest `json:"files"`
	CommitMessage string                   `json:"commit_message"`
}
