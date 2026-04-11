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

type CommitFileRequest struct {
	Branch        string `json:"branch"`
	Path          string `json:"path"`
	Content       string `json:"content"`
	CommitMessage string `json:"commit_message"`
}
