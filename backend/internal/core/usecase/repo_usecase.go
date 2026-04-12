package usecase

import (
	"errors"
	"fmt"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"

	"github.com/google/uuid"
)

// RepoService implements the business logic for repositories
type RepoService struct {
	gitManager  port.GitManager // Dependency injected via interface
	repoStore   port.RepoRepository
	collabStore port.CollaboratorRepository
	userStore   port.UserRepository

	repoInsightsScheduler port.RepoInsightsScheduler
}

// NewRepoService creates a new usecase instance
func NewRepoService(
	gm port.GitManager,
	rs port.RepoRepository,
	cs port.CollaboratorRepository,
	us port.UserRepository,
	ris port.RepoInsightsScheduler,
) *RepoService {
	return &RepoService{
		gitManager:            gm,
		repoStore:             rs,
		collabStore:           cs,
		userStore:             us,
		repoInsightsScheduler: ris,
	}
}

// CreateRepository is the actual business logic
func (s *RepoService) CreateRepository(name string, ownerID uuid.UUID) (*domain.Repo, error) {
	return s.CreateRepositoryWithOptions(name, ownerID, domain.CreateRepositoryOptions{})
}

func (s *RepoService) CreateRepositoryWithOptions(name string, ownerID uuid.UUID, options domain.CreateRepositoryOptions) (*domain.Repo, error) {
	if err := domain.ValidateRepoName(name); err != nil {
		return nil, err
	}

	normalizedOptions, err := normalizeCreateRepositoryOptions(options)
	if err != nil {
		return nil, err
	}

	owner, err := s.userStore.GetUserByID(ownerID)
	if err != nil || owner == nil {
		return nil, errors.New("owner user not found")
	}

	repoSlug := owner.Username + "/" + name

	// Call the infrastructure layer via the interface
	fullPath, err := s.gitManager.InitBareRepo(repoSlug)
	if err != nil {
		return nil, err
	}

	initialFiles := buildInitialRepositoryFiles(name, owner.Username, normalizedOptions)
	if len(initialFiles) > 0 {
		if err := s.gitManager.BootstrapRepository(fullPath, "master", owner.Username,
			initialFiles, "Initial commit"); err != nil {

			return nil, err
		}
	}

	repo := &domain.Repo{
		Name:        name,
		Path:        fullPath,
		CreatedAt:   time.Now(),
		Description: normalizedOptions.Description,
		Visibility:  normalizedOptions.Visibility,
	}

	// Save the metadata to database
	err = s.repoStore.Save(repo)
	if err != nil {
		// Note: In a production system, we'd want a "Saga" here to delete the physical folder
		// if the database insert fails. We will keep it simple for now.
		return nil, err
	}

	repoUUID, err := uuid.Parse(repo.ID)
	if err != nil {
		return nil, errors.New("failed to parse created repository id")
	}

	err = s.collabStore.AddCollaborator(repoUUID, ownerID,
		domain.CollaboratorRoleOwner)
	if err != nil {
		return nil, err
	}

	s.enqueueInsights(repoUUID, "repo_created")

	return repo, nil
}

func normalizeCreateRepositoryOptions(options domain.CreateRepositoryOptions) (domain.CreateRepositoryOptions, error) {
	normalized := options
	normalized.Description = strings.TrimSpace(options.Description)
	normalized.GitignoreTemplate = strings.ToLower(strings.TrimSpace(options.GitignoreTemplate))
	normalized.LicenseTemplate = strings.ToLower(strings.TrimSpace(options.LicenseTemplate))
	normalized.Visibility = domain.RepoVisibility(strings.TrimSpace(string(options.Visibility)))

	if normalized.Visibility == "" {
		normalized.Visibility = domain.RepoVisibilityPublic
	}

	if err := domain.ValidateRepoVisibility(normalized.Visibility); err != nil {
		return domain.CreateRepositoryOptions{}, err
	}

	if normalized.GitignoreTemplate == "none" {
		normalized.GitignoreTemplate = ""
	}

	if normalized.LicenseTemplate == "none" {
		normalized.LicenseTemplate = ""
	}

	return normalized, nil
}

func buildInitialRepositoryFiles(repoName string, ownerName string, options domain.CreateRepositoryOptions) map[string]string {
	files := map[string]string{}

	if options.InitializeReadme {
		files["README.md"] = buildReadmeContent(repoName, options.Description)
	}

	if gitignore, ok := gitignoreTemplateContent(options.GitignoreTemplate); ok {
		files[".gitignore"] = gitignore
	}

	if license, ok := licenseTemplateContent(options.LicenseTemplate, ownerName); ok {
		files["LICENSE"] = license
	}

	return files
}

func buildReadmeContent(repoName string, description string) string {
	trimmedDescription := strings.TrimSpace(description)
	if trimmedDescription == "" {
		return fmt.Sprintf("# %s", repoName)
	}

	return fmt.Sprintf("# %s\n\n%s", repoName, trimmedDescription)
}

func gitignoreTemplateContent(templateName string) (string, bool) {
	switch templateName {
	case "go":
		return "# Binaries\n*.exe\n*.exe~\n*.dll\n*.so\n*.dylib\n\n# Test binary\n*.test\n\n# Vendor\nvendor/\n\n# IDE\n.vscode/\n.idea/\n", true
	case "node", "nodejs":
		return "node_modules/\ndist/\nbuild/\ncoverage/\n.env\n.env.*\n.vscode/\n", true
	case "python":
		return "__pycache__/\n*.py[cod]\n*.pyo\n*.pyd\n.venv/\nvenv/\n.env\n.pytest_cache/\n", true
	case "java":
		return "target/\n*.class\n*.jar\n*.war\n.idea/\n.vscode/\n", true
	case "rust":
		return "target/\n**/*.rs.bk\nCargo.lock\n", true
	default:
		return "", false
	}
}

func licenseTemplateContent(templateName string, ownerName string) (string, bool) {
	year := time.Now().Year()

	switch templateName {
	case "mit":
		return fmt.Sprintf("MIT License\n\nCopyright (c) %d %s\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n", year, ownerName), true
	case "apache-2.0":
		return "Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/\n\nCopyright [year] [name of copyright owner]\n\nLicensed under the Apache License, Version 2.0 (the \"License\");\nyou may not use this file except in compliance with the License.\nYou may obtain a copy of the License at\n\n    http://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software\ndistributed under the License is distributed on an \"AS IS\" BASIS,\nWITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\nSee the License for the specific language governing permissions and\nlimitations under the License.\n", true
	case "gpl-3.0":
		return "GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n\nCopyright (C) 2007 Free Software Foundation, Inc.\n\nThis program is free software: you can redistribute it and/or modify\nit under the terms of the GNU General Public License as published by\nthe Free Software Foundation, either version 3 of the License, or\n(at your option) any later version.\n\nThis program is distributed in the hope that it will be useful,\nbut WITHOUT ANY WARRANTY; without even the implied warranty of\nMERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the\nGNU General Public License for more details.\n\nYou should have received a copy of the GNU General Public License\nalong with this program. If not, see <https://www.gnu.org/licenses/>.\n", true
	default:
		return "", false
	}
}

func (s *RepoService) resolveRepoPath(repoID uuid.UUID) (string, error) {
	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return "", err
	}
	if repo == nil {
		return "", errors.New("repository not found")
	}
	return repo.Path, nil
}

func (s *RepoService) resolveRepoPathByOwnerAndName(ownerUsername string, repoName string) (string, error) {
	repo, err := s.repoStore.FindByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return "", err
	}
	if repo == nil {
		return "", errors.New("repository not found")
	}
	return repo.Path, nil
}

// Deprecated: use GetIntoRefsByOwnerAndName for username/repo clone flow.
func (s *RepoService) GetIntoRefs(repoID uuid.UUID, service string) ([]byte, error) {
	if err := domain.ValidateGitService(service); err != nil {
		return nil, err
	}

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.AdvertiseRefs(repoPath, service)
}

func (s *RepoService) GetIntoRefsByOwnerAndName(ownerUsername string, repoName string, service string) ([]byte, error) {
	if err := domain.ValidateGitService(service); err != nil {
		return nil, err
	}

	repoPath, err := s.resolveRepoPathByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return nil, err
	}

	return s.gitManager.AdvertiseRefs(repoPath, service)
}

// Deprecated: use UploadPackByOwnerAndName for username/repo clone flow.
func (s *RepoService) UploadPack(repoID uuid.UUID, requestPayload port.ByteReader,
	responseWriter port.ByteWriter) error {

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return err
	}

	return s.gitManager.UploadPack(repoPath, requestPayload, responseWriter)
}

func (s *RepoService) UploadPackByOwnerAndName(ownerUsername string, repoName string,
	requestPayload port.ByteReader, responseWriter port.ByteWriter) error {

	repoPath, err := s.resolveRepoPathByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return err
	}

	return s.gitManager.UploadPack(repoPath, requestPayload, responseWriter)
}

// Deprecated: repo_id receive-pack path is legacy and not publicly exposed.
func (s *RepoService) ReceivePack(repoID uuid.UUID, requestPayload port.ByteReader,
	responseWriter port.ByteWriter) error {

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return err
	}

	if err := s.gitManager.ReceivePack(repoPath, requestPayload, responseWriter); err != nil {
		return err
	}

	s.enqueueInsights(repoID, "receive_pack_legacy")

	return nil
}

func (s *RepoService) ReceivePackByOwnerAndName(ownerUsername string, repoName string,
	requestPayload port.ByteReader, responseWriter port.ByteWriter) error {

	repoPath, err := s.resolveRepoPathByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return err
	}

	if err := s.gitManager.ReceivePack(repoPath, requestPayload, responseWriter); err != nil {
		return err
	}

	repo, err := s.repoStore.FindByOwnerAndName(ownerUsername, repoName)
	if err == nil && repo != nil {
		if repoUUID, parseErr := uuid.Parse(repo.ID); parseErr == nil {
			s.enqueueInsights(repoUUID, "receive_pack_public")
		}
	}

	return nil
}

func (s *RepoService) GetAllRepositories() ([]*domain.Repo, error) {
	repos, err := s.repoStore.FindAll()
	if err != nil {
		return nil, err
	}

	for _, repo := range repos {
		if repo == nil {
			continue
		}

		if strings.TrimSpace(repo.Description) == "" {
			repo.Description = inferDescriptionFromReadme(s.gitManager, repo.Path)
		}

		if strings.TrimSpace(repo.PrimaryLanguage) != "" {
			continue
		}

		repoUUID, parseErr := uuid.Parse(repo.ID)
		if parseErr != nil {
			continue
		}

		s.enqueueInsights(repoUUID, "repo_list_missing_primary_language")
	}

	return repos, nil
}

func inferDescriptionFromReadme(gitManager port.GitManager, repoPath string) string {
	content, err := gitManager.GetBlob(repoPath, "README.md", "")
	if err != nil {
		content, err = gitManager.GetBlob(repoPath, "readme.md", "")
		if err != nil {
			return ""
		}
	}

	for _, line := range strings.Split(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		if strings.HasPrefix(trimmed, "#") || strings.HasPrefix(trimmed, "[!") {
			continue
		}

		if len(trimmed) > 180 {
			return strings.TrimSpace(trimmed[:180]) + "..."
		}

		return trimmed
	}

	return ""
}

func (s *RepoService) GetRepoTree(repoID uuid.UUID, path string, branch string) ([]domain.RepoFile, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetTree(repoPath, path, branch)
}

func (s *RepoService) GetRepoBlob(repoID uuid.UUID, path string, branch string) (string, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return "", err
	}

	return s.gitManager.GetBlob(repoPath, path, branch)
}

func (s *RepoService) GetRepoCommits(repoID uuid.UUID, branch string) ([]domain.Commit, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetCommits(repoPath, branch)
}

func (s *RepoService) GetRepoBranches(repoID uuid.UUID) ([]domain.Branch, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetBranches(repoPath)
}

func (s *RepoService) CreateRepoBranch(repoID uuid.UUID, newBranch string, fromBranch string) (*domain.Branch, error) {
	if err := domain.ValidateBranchName(newBranch); err != nil {
		return nil, err
	}

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.CreateBranch(repoPath, newBranch, fromBranch)
}

func (s *RepoService) CommitFileChange(repoID uuid.UUID, requesterID uuid.UUID,
	branch string, filePath string, content string, commitMessage string) error {
	if err := domain.ValidateCommitFileChangeInput(branch, filePath,
		commitMessage); err != nil {

		return err
	}

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return err
	}

	user, err := s.userStore.GetUserByID(requesterID)
	if err != nil || user == nil {
		return errors.New("requester user not found")
	}

	if err := s.gitManager.CommitFileChange(repoPath, branch, filePath, content,
		user.Username, commitMessage); err != nil {
		return err
	}

	s.enqueueInsights(repoID, "commit_file_change")

	return nil
}

func (s *RepoService) CommitFilesChange(repoID uuid.UUID, requesterID uuid.UUID,
	branch string, files map[string]string, commitMessage string) error {
	if err := domain.ValidateCommitFilesChangeInput(branch, files,
		commitMessage); err != nil {

		return err
	}

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return err
	}

	user, err := s.userStore.GetUserByID(requesterID)
	if err != nil || user == nil {
		return errors.New("requester user not found")
	}

	if err := s.gitManager.CommitFilesChange(repoPath, branch, files,
		user.Username, commitMessage); err != nil {
		return err
	}

	s.enqueueInsights(repoID, "commit_files_change")

	return nil
}

func (s *RepoService) enqueueInsights(repoID uuid.UUID, trigger string) {
	if s.repoInsightsScheduler == nil {
		return
	}
	if err := s.repoInsightsScheduler.EnqueueRecompute(repoID, trigger); err != nil {
		// Do not fail push path because of analytics queue pressure
	}
}
