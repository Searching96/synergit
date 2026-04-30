package repository

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path" // Use path instead filepath to guarantee forward slashes (/)
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// --- Compile-time interface check ---
// If LocalGitAdapter ever fails to implement port.GitManager,
// the compiler will throw an error exactly on this line.
var _ port.GitManager = (*LocalGitAdapter)(nil)

// LocalGitAdapter implements port.GitManager using the local OS
type LocalGitAdapter struct {
	storageRoot string
}

func NewLocalGitAdapter(root string) *LocalGitAdapter {
	return &LocalGitAdapter{
		storageRoot: root,
	}
}

func (g *LocalGitAdapter) resolveRepoPath(repoLocator string) string {
	if filepath.IsAbs(repoLocator) {
		return repoLocator
	}

	slug := strings.TrimSpace(repoLocator)
	if strings.HasSuffix(slug, ".git") {
		return filepath.Join(g.storageRoot, filepath.FromSlash(slug))
	}

	return filepath.Join(g.storageRoot, filepath.FromSlash(slug)+".git")
}

func compareFileStatusFromToken(token string) domain.CompareFileStatus {
	status := strings.ToUpper(strings.TrimSpace(token))
	if status == "" {
		return domain.CompareFileStatusUnknown
	}

	switch status[0] {
	case 'A':
		return domain.CompareFileStatusAdded
	case 'M':
		return domain.CompareFileStatusModified
	case 'D':
		return domain.CompareFileStatusDeleted
	case 'R':
		return domain.CompareFileStatusRenamed
	case 'C':
		return domain.CompareFileStatusCopied
	default:
		return domain.CompareFileStatusUnknown
	}
}

func parseNumstatValue(raw string) int {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || trimmed == "-" {
		return 0
	}

	parsed, err := strconv.Atoi(trimmed)
	if err != nil {
		return 0
	}

	return parsed
}

func parseRenamePath(rawPath string) (string, string) {
	trimmed := strings.TrimSpace(rawPath)
	if trimmed == "" || !strings.Contains(trimmed, "=>") {
		return "", trimmed
	}

	start := strings.Index(trimmed, "{")
	end := strings.Index(trimmed, "}")
	if start >= 0 && end > start {
		prefix := trimmed[:start]
		suffix := trimmed[end+1:]
		inside := trimmed[start+1 : end]
		parts := strings.SplitN(inside, "=>", 2)
		if len(parts) == 2 {
			oldPart := strings.TrimSpace(parts[0])
			newPart := strings.TrimSpace(parts[1])
			oldPath := strings.TrimSpace(prefix + oldPart + suffix)
			newPath := strings.TrimSpace(prefix + newPart + suffix)
			return oldPath, newPath
		}
	}

	parts := strings.SplitN(trimmed, "=>", 2)
	if len(parts) != 2 {
		return "", trimmed
	}

	return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
}

// InitBareRepo satisfies the port.GitManager interface
func (g *LocalGitAdapter) InitBareRepo(repoSlug string) (string, error) {
	cleanSlug := path.Clean(strings.TrimSpace(repoSlug))
	if cleanSlug == "." || strings.HasPrefix(cleanSlug, "../") ||
		strings.Contains(cleanSlug, "/../") {

		return "", errors.New("invalid repository path")
	}

	fullPath := g.resolveRepoPath(cleanSlug)

	if _, err := os.Stat(fullPath); !os.IsNotExist(err) {
		return "", fmt.Errorf("repository %s already exists", cleanSlug)
	}

	if err := os.MkdirAll(fullPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	cmd := exec.Command("git", "init", "--bare")
	cmd.Dir = fullPath

	if output, err := cmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("git init failed: %s: %w", string(output), err)
	}

	return fullPath, nil
}

func (g *LocalGitAdapter) BootstrapRepository(repoPath string, branch string,
	authorName string, files map[string]string, commitMessage string) error {

	if len(files) == 0 {
		return nil
	}

	bareRepoPath := g.resolveRepoPath(repoPath)

	tempDir, err := os.MkdirTemp("", "synergit-bootstrap-*")
	if err != nil {
		return fmt.Errorf("failed to create temp bootstrap directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	runGit := func(args ...string) error {
		cmd := exec.Command("git", args...)
		cmd.Dir = tempDir
		var stderr bytes.Buffer
		cmd.Stderr = &stderr

		if err := cmd.Run(); err != nil {
			return fmt.Errorf("git %s failed: %s", args[0], strings.TrimSpace(stderr.String()))
		}

		return nil
	}

	if err := runGit("clone", bareRepoPath, tempDir); err != nil {
		return fmt.Errorf("failed to clone repository for bootstrap: %w", err)
	}

	if err := runGit("checkout", "--orphan", branch); err != nil {
		if checkoutErr := runGit("checkout", branch); checkoutErr != nil {
			return fmt.Errorf("failed to create initial branch: %w", err)
		}
	}

	email := fmt.Sprintf("%s@synergit.local", authorName)
	if err := runGit("config", "user.name", authorName); err != nil {
		return err
	}

	if err := runGit("config", "user.email", email); err != nil {
		return err
	}

	filePaths := make([]string, 0, len(files))
	for filePath := range files {
		filePaths = append(filePaths, filePath)
	}
	sort.Strings(filePaths)

	for _, filePath := range filePaths {
		cleanPath := filepath.Clean(filepath.FromSlash(filePath))
		if cleanPath == "." || filepath.IsAbs(cleanPath) {
			return errors.New("invalid bootstrap file path")
		}

		fullPath := filepath.Join(tempDir, cleanPath)
		relPath, err := filepath.Rel(tempDir, fullPath)
		if err != nil || strings.HasPrefix(relPath, "..") {
			return errors.New("invalid bootstrap file path")
		}

		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			return fmt.Errorf("failed to create bootstrap file directory: %w", err)
		}

		if err := os.WriteFile(fullPath, []byte(files[filePath]), 0644); err != nil {
			return fmt.Errorf("failed to write bootstrap file: %w", err)
		}
	}

	if err := runGit("add", "."); err != nil {
		return fmt.Errorf("failed to stage bootstrap files: %w", err)
	}

	if err := runGit("commit", "-m", commitMessage); err != nil {
		return fmt.Errorf("failed to create bootstrap commit: %w", err)
	}

	if err := runGit("push", "origin", branch); err != nil {
		return fmt.Errorf("failed to push bootstrap branch: %w", err)
	}

	return nil
}

func (g *LocalGitAdapter) AdvertiseRefs(repoPath string, service string) ([]byte, error) {
	fullPath := g.resolveRepoPath(repoPath)

	// The client asks for "git-upload-pack", but the command is just "upload-pack"
	cmdName := strings.TrimPrefix(service, "git-")

	// --stateless-rpc tells git we are over HTTP, not SSH
	cmd := exec.Command("git", cmdName, "--stateless-rpc", "--advertise-refs", fullPath)
	return cmd.Output()
}

func (g *LocalGitAdapter) UploadPack(repoPath string,
	requestPayload port.ByteReader, responseWriter port.ByteWriter) error {

	fullPath := g.resolveRepoPath(repoPath)
	cmd := exec.Command("git", "upload-pack", "--stateless-rpc", fullPath)

	cmd.Stdin = requestPayload

	var stderr bytes.Buffer
	cmd.Stdout = responseWriter
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git upload-pack failed: %s: %w",
			strings.TrimSpace(stderr.String()), err)
	}

	return nil
}

// Process incoming git pushes
func (g *LocalGitAdapter) ReceivePack(repoPath string,
	requestPayload port.ByteReader, responseWriter port.ByteWriter) error {

	fullPath := g.resolveRepoPath(repoPath)

	cmd := exec.Command("git", "receive-pack", "--stateless-rpc", fullPath)

	cmd.Stdin = requestPayload

	var stderr bytes.Buffer
	cmd.Stdout = responseWriter
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git receive-pack failed: %s: %w",
			strings.TrimSpace(stderr.String()), err)
	}

	return nil
}

func (g *LocalGitAdapter) GetTree(repoPath string, requestPath string,
	branch string) ([]domain.RepoFile, error) {

	fullPath := g.resolveRepoPath(repoPath)

	// 1. Open the repository
	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repo: %w", err)
	}

	// 2. Get the HEAD reference (usually the 'master' or 'main' branch)
	ref, err := getBranchRef(r, branch)
	if err != nil {
		// If branch is completely empty (no commits yet), getBranchRef() returns and error
		if err == plumbing.ErrReferenceNotFound {
			return []domain.RepoFile{}, nil // Return an empty array instead of an error
		}
		return nil, err
	}

	// 3. Get the commit object that HEAD points to
	commit, err := r.CommitObject(ref.Hash())
	if err != nil {
		return nil, err
	}

	// 4. Get the root file tree of that commit
	tree, err := commit.Tree()
	if err != nil {
		return nil, err
	}

	// 5. If the user requested a specific sub-folder, navigate to it
	var targetTree *object.Tree
	if requestPath == "" || requestPath == "/" {
		targetTree = tree
	} else {
		targetTree, err = tree.Tree(requestPath)

		if err != nil {
			return nil, fmt.Errorf("path not found: %w", err)
		}
	}

	// 6. Map the Git entries to our domain model
	var files []domain.RepoFile
	for _, entry := range targetTree.Entries {
		nodeType := domain.RepoFileTypeFile
		if !entry.Mode.IsFile() {
			nodeType = domain.RepoFileTypeDir
		}

		files = append(files, domain.RepoFile{
			Name: entry.Name,
			Path: path.Join(requestPath, entry.Name), // e.g., "src/main.go"
			Type: nodeType,
		})
	}

	return files, nil
}

func (g *LocalGitAdapter) GetBlob(repoPath string, requestPath string,
	branch string) (string, error) {

	fullPath := g.resolveRepoPath(repoPath)

	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to open repo: %w", err)
	}

	ref, err := getBranchRef(r, branch)
	if err != nil {
		return "", err
	}

	commit, err := r.CommitObject(ref.Hash())
	if err != nil {
		return "", err
	}

	tree, err := commit.Tree()
	if err != nil {
		return "", err
	}

	// Find the specific file in the tree
	file, err := tree.File(requestPath)
	if err != nil {
		return "", fmt.Errorf("file not found: %w", err)
	}

	// Extract the string content
	content, err := file.Contents()
	if err != nil {
		return "", fmt.Errorf("failed to read file content: %w", err)
	}

	return content, nil
}

func (g *LocalGitAdapter) GetCommits(repoPath string, branch string, pathFilter string) ([]domain.Commit,
	error) {

	fullPath := g.resolveRepoPath(repoPath)

	// 1. Open the repository
	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repo: %w", err)
	}

	// 2. Get HEAD
	ref, err := getBranchRef(r, branch)
	if err != nil {
		if err == plumbing.ErrReferenceNotFound {
			// Branch is empty, no commits yet
			return []domain.Commit{}, nil
		}
		// Other errors except empty repo error
		return nil, err
	}

	normalizedPath := normalizeCommitPath(pathFilter)
	if normalizedPath == "" {
		return listCommits(r, &git.LogOptions{From: ref.Hash()})
	}

	isDirectory, err := isDirectoryPathAtRef(r, ref.Hash(), normalizedPath)
	if err != nil {
		return nil, err
	}

	if isDirectory {
		return listDirectoryCommits(r, ref.Hash(), normalizedPath)
	}

	return listCommits(r, &git.LogOptions{
		From:     ref.Hash(),
		FileName: &normalizedPath,
	})
}

func normalizeCommitPath(pathFilter string) string {
	trimmedPath := strings.TrimSpace(pathFilter)
	if trimmedPath == "" {
		return ""
	}

	normalizedPath := path.Clean(strings.ReplaceAll(trimmedPath, "\\", "/"))
	normalizedPath = strings.TrimPrefix(normalizedPath, "/")
	if normalizedPath == "." {
		return ""
	}

	return normalizedPath
}

func listCommits(r *git.Repository, logOptions *git.LogOptions) ([]domain.Commit, error) {
	commitIter, err := r.Log(logOptions)
	if err != nil {
		return nil, err
	}
	defer commitIter.Close()

	var commits []domain.Commit
	err = commitIter.ForEach(func(c *object.Commit) error {
		commits = append(commits, mapToDomainCommit(c))
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to iterate commits: %w", err)
	}

	return commits, nil
}

func mapToDomainCommit(c *object.Commit) domain.Commit {
	return domain.Commit{
		Hash:    c.Hash.String(),
		Author:  c.Author.Name,
		Message: strings.TrimSpace(c.Message),
		Date:    c.Author.When,
	}
}

func isDirectoryPathAtRef(r *git.Repository, refHash plumbing.Hash, normalizedPath string) (bool, error) {
	commit, err := r.CommitObject(refHash)
	if err != nil {
		return false, err
	}

	tree, err := commit.Tree()
	if err != nil {
		return false, err
	}

	_, dirErr := tree.Tree(normalizedPath)
	if dirErr == nil {
		return true, nil
	}
	if !errors.Is(dirErr, object.ErrDirectoryNotFound) {
		return false, dirErr
	}

	_, fileErr := tree.File(normalizedPath)
	if fileErr == nil || errors.Is(fileErr, object.ErrFileNotFound) {
		return false, nil
	}

	return false, fileErr
}

// Folder rows should display the latest commit that touched any descendant file.
func listDirectoryCommits(r *git.Repository, refHash plumbing.Hash,
	normalizedDirPath string) ([]domain.Commit, error) {

	commitIter, err := r.Log(&git.LogOptions{From: refHash})
	if err != nil {
		return nil, err
	}
	defer commitIter.Close()

	prefix := normalizedDirPath + "/"
	var commits []domain.Commit

	err = commitIter.ForEach(func(c *object.Commit) error {
		touchesDirectory, statsErr := commitTouchesDirectory(c, normalizedDirPath, prefix)
		if statsErr != nil {
			return statsErr
		}
		if !touchesDirectory {
			return nil
		}

		commits = append(commits, mapToDomainCommit(c))
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to iterate commits for directory %q: %w", normalizedDirPath, err)
	}

	return commits, nil
}

func commitTouchesDirectory(commit *object.Commit, exactDir string,
	prefixDir string) (bool, error) {

	stats, err := commit.Stats()
	if err != nil {
		return false, err
	}

	for _, stat := range stats {
		changedPath := normalizeCommitPath(stat.Name)
		if changedPath == exactDir || strings.HasPrefix(changedPath, prefixDir) {
			return true, nil
		}
	}

	return false, nil
}

func getBranchRef(r *git.Repository, branch string) (*plumbing.Reference, error) {
	if branch == "" {
		return r.Head()
	}

	trimmed := strings.TrimSpace(branch)
	branchRef, err := r.Reference(plumbing.ReferenceName("refs/heads/"+trimmed), true)
	if err == nil {
		return branchRef, nil
	}

	if !errors.Is(err, plumbing.ErrReferenceNotFound) {
		return nil, err
	}

	// Support browsing repository state by commit hash or other git revision expressions.
	resolvedHash, resolveErr := r.ResolveRevision(plumbing.Revision(trimmed))
	if resolveErr == nil {
		return plumbing.NewHashReference(plumbing.ReferenceName("refs/revisions/"+trimmed), *resolvedHash), nil
	}

	return nil, err
}

func (g *LocalGitAdapter) GetBranches(repoPath string) ([]domain.Branch, error) {
	fullPath := g.resolveRepoPath(repoPath)
	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return nil, err
	}

	// Get the default branch from HEAD
	headRef, _ := r.Head()
	headBranchName := ""
	if headRef != nil {
		headBranchName = headRef.Name().Short()
	}

	iter, err := r.Branches()
	if err != nil {
		return nil, err
	}

	var branches []domain.Branch
	err = iter.ForEach(func(ref *plumbing.Reference) error {
		branches = append(branches, domain.Branch{
			Name:       ref.Name().Short(),
			CommitHash: ref.Hash().String(),
			IsDefault:  ref.Name().Short() == headBranchName,
		})
		return nil
	})

	return branches, err
}

func (g *LocalGitAdapter) CreateBranch(repoPath string, newBranch string,
	fromBranch string) (*domain.Branch, error) {

	fullPath := g.resolveRepoPath(repoPath)
	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repo: %w", err)
	}

	newRefName := plumbing.NewBranchReferenceName(newBranch)
	if err := newRefName.Validate(); err != nil {
		return nil, fmt.Errorf("invalid branch name: %w", err)
	}

	if _, err := r.Reference(newRefName, true); err == nil {
		return nil, errors.New("branch already exists")
	} else if err != plumbing.ErrReferenceNotFound {
		return nil, err
	}

	sourceRef, err := getBranchRef(r, fromBranch)
	if err != nil {
		if fromBranch == "" {
			return nil, errors.New("cannot create branch: repository has no commits yet")
		}
		return nil, fmt.Errorf("source branch not found: %w", err)
	}

	newRef := plumbing.NewHashReference(newRefName, sourceRef.Hash())
	if err := r.Storer.SetReference(newRef); err != nil {
		return nil, fmt.Errorf("failed to create branch: %w", err)
	}

	return &domain.Branch{
		Name:       newBranch,
		CommitHash: sourceRef.Hash().String(),
		IsDefault:  false,
	}, nil
}

func (g *LocalGitAdapter) CommitFileChange(repoPath string, branch string,
	filePath string, content string, authorName string, commitMessage string) error {

	bareRepoPath := g.resolveRepoPath(repoPath)

	tempDir, err := os.MkdirTemp("", "synergit-edit-commit-*")
	if err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	runGit := func(args ...string) error {
		cmd := exec.Command("git", args...)
		cmd.Dir = tempDir
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("git %s failed: %s", args[0], strings.TrimSpace(stderr.String()))
		}
		return nil
	}

	if err := runGit("clone", bareRepoPath, tempDir); err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}

	if err := runGit("checkout", "-B", branch, "origin/"+branch); err != nil {
		return fmt.Errorf("failed to checkout branch: %w", err)
	}

	cleanPath := filepath.Clean(filepath.FromSlash(filePath))
	if cleanPath == "." || filepath.IsAbs(cleanPath) {
		return errors.New("invalid file path")
	}

	fullPath := filepath.Join(tempDir, cleanPath)
	relPath, err := filepath.Rel(tempDir, fullPath)
	if err != nil || strings.HasPrefix(relPath, "..") {
		return errors.New("invalid file path")
	}

	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return fmt.Errorf("failed to create file directory: %w", err)
	}

	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	if err := runGit("add", cleanPath); err != nil {
		return fmt.Errorf("failed to stage file: %w", err)
	}

	email := fmt.Sprintf("%s@synergit.local", authorName)
	if err := runGit("config", "user.name", authorName); err != nil {
		return err
	}
	if err := runGit("config", "user.email", email); err != nil {
		return err
	}

	if err := runGit("commit", "-m", commitMessage); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "nothing to commit") {
			return errors.New("no changes to commit")
		}
		return fmt.Errorf("failed to commit changes: %w", err)
	}

	if err := runGit("push", "origin", branch); err != nil {
		return fmt.Errorf("failed to push branch: %w", err)
	}

	return nil
}

func (g *LocalGitAdapter) CommitFilesChange(repoPath string, branch string,
	files map[string]string, authorName string, commitMessage string) error {

	bareRepoPath := g.resolveRepoPath(repoPath)

	tempDir, err := os.MkdirTemp("", "synergit-edit-commit-many-*")
	if err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	runGit := func(args ...string) error {
		cmd := exec.Command("git", args...)
		cmd.Dir = tempDir
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("git %s failed: %s", args[0], strings.TrimSpace(stderr.String()))
		}
		return nil
	}

	if err := runGit("clone", bareRepoPath, tempDir); err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}

	if err := runGit("checkout", "-B", branch, "origin/"+branch); err != nil {
		return fmt.Errorf("failed to checkout branch: %w", err)
	}

	filePaths := make([]string, 0, len(files))
	for filePath := range files {
		filePaths = append(filePaths, filePath)
	}
	sort.Strings(filePaths)

	for _, filePath := range filePaths {
		cleanPath := filepath.Clean(filepath.FromSlash(filePath))
		if cleanPath == "." || filepath.IsAbs(cleanPath) {
			return errors.New("invalid file path")
		}

		fullPath := filepath.Join(tempDir, cleanPath)
		relPath, err := filepath.Rel(tempDir, fullPath)
		if err != nil || strings.HasPrefix(relPath, "..") {
			return errors.New("invalid file path")
		}

		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			return fmt.Errorf("failed to create file directory: %w", err)
		}

		if err := os.WriteFile(fullPath, []byte(files[filePath]), 0644); err != nil {
			return fmt.Errorf("failed to write file: %w", err)
		}

		if err := runGit("add", cleanPath); err != nil {
			return fmt.Errorf("failed to stage file: %w", err)
		}
	}

	email := fmt.Sprintf("%s@synergit.local", authorName)
	if err := runGit("config", "user.name", authorName); err != nil {
		return err
	}
	if err := runGit("config", "user.email", email); err != nil {
		return err
	}

	if err := runGit("commit", "-m", commitMessage); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "nothing to commit") {
			return errors.New("no changes to commit")
		}
		return fmt.Errorf("failed to commit changes: %w", err)
	}

	if err := runGit("push", "origin", branch); err != nil {
		return fmt.Errorf("failed to push branch: %w", err)
	}

	return nil
}

func (g *LocalGitAdapter) CompareRefs(repoPath string, baseRef string,
	headRef string) (*domain.PullRequestCompareResult, error) {

	bareRepoPath := g.resolveRepoPath(repoPath)
	base := strings.TrimSpace(baseRef)
	head := strings.TrimSpace(headRef)

	result := &domain.PullRequestCompareResult{
		BaseRef:      base,
		HeadRef:      head,
		CanCompare:   false,
		Mergeable:    false,
		MergeMessage: "Choose different branches or refs to compare.",
		Summary:      domain.PullRequestCompareSummary{},
		Commits:      []domain.Commit{},
		Files:        []domain.CompareFile{},
	}

	tempDir, err := os.MkdirTemp("", "synergit-compare-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp compare directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	runGitRaw := func(args ...string) (string, error) {
		cmd := exec.Command("git", args...)
		cmd.Dir = tempDir
		output, runErr := cmd.CombinedOutput()
		return strings.TrimSpace(string(output)), runErr
	}

	runGit := func(args ...string) (string, error) {
		output, runErr := runGitRaw(args...)
		if runErr != nil {
			return "", fmt.Errorf("git %s failed: %s", args[0], output)
		}

		return output, nil
	}

	cloneCmd := exec.Command("git", "clone", bareRepoPath, tempDir)
	if output, cloneErr := cloneCmd.CombinedOutput(); cloneErr != nil {
		return nil, fmt.Errorf("failed to clone repository for compare: %w: %s", cloneErr,
			strings.TrimSpace(string(output)))
	}

	resolveRef := func(ref string) (string, error) {
		trimmed := strings.TrimSpace(ref)
		if trimmed == "" {
			return "", errors.New("ref cannot be empty")
		}

		candidates := []string{trimmed}
		if !strings.HasPrefix(trimmed, "origin/") {
			candidates = append(candidates, "origin/"+trimmed)
		}

		seen := make(map[string]struct{})
		for _, candidate := range candidates {
			if _, exists := seen[candidate]; exists {
				continue
			}

			seen[candidate] = struct{}{}
			resolved, resolveErr := runGit("rev-parse", "--verify", candidate)
			if resolveErr == nil {
				return strings.TrimSpace(resolved), nil
			}
		}

		return "", fmt.Errorf("invalid ref %q", trimmed)
	}

	baseHash, err := resolveRef(base)
	if err != nil {
		return nil, err
	}

	headHash, err := resolveRef(head)
	if err != nil {
		return nil, err
	}

	if baseHash == headHash {
		result.MergeMessage = "There isn't anything to compare. Select two different refs."
		return result, nil
	}

	mergeBaseHash, err := runGit("merge-base", baseHash, headHash)
	if err != nil {
		return nil, fmt.Errorf("failed to compute merge base: %w", err)
	}

	commitRange := fmt.Sprintf("%s..%s", strings.TrimSpace(mergeBaseHash), headHash)
	commitLogOutput, err := runGit("log", "--pretty=format:%H%x1f%an%x1f%at%x1f%s",
		commitRange)
	if err != nil {
		return nil, fmt.Errorf("failed to read compare commits: %w", err)
	}

	commits := make([]domain.Commit, 0)
	contributors := make(map[string]struct{})
	if strings.TrimSpace(commitLogOutput) != "" {
		for _, line := range strings.Split(strings.TrimSpace(commitLogOutput), "\n") {
			if strings.TrimSpace(line) == "" {
				continue
			}

			parts := strings.SplitN(line, "\x1f", 4)
			if len(parts) < 4 {
				continue
			}

			timestampSeconds, parseErr := strconv.ParseInt(strings.TrimSpace(parts[2]), 10, 64)
			if parseErr != nil {
				timestampSeconds = 0
			}

			author := strings.TrimSpace(parts[1])
			if author != "" {
				contributors[author] = struct{}{}
			}

			commits = append(commits, domain.Commit{
				Hash:    strings.TrimSpace(parts[0]),
				Author:  author,
				Message: strings.TrimSpace(parts[3]),
				Date:    time.Unix(timestampSeconds, 0).UTC(),
			})
		}
	}

	nameStatusOutput, err := runGit("diff", "--name-status", commitRange)
	if err != nil {
		return nil, fmt.Errorf("failed to read compare file status: %w", err)
	}

	filesByPath := make(map[string]*domain.CompareFile)
	if strings.TrimSpace(nameStatusOutput) != "" {
		for _, line := range strings.Split(strings.TrimSpace(nameStatusOutput), "\n") {
			if strings.TrimSpace(line) == "" {
				continue
			}

			parts := strings.Split(line, "\t")
			if len(parts) < 2 {
				continue
			}

			status := compareFileStatusFromToken(parts[0])
			statusToken := strings.ToUpper(strings.TrimSpace(parts[0]))

			if (strings.HasPrefix(statusToken, "R") || strings.HasPrefix(statusToken, "C")) && len(parts) >= 3 {
				previousPath := strings.TrimSpace(parts[1])
				filePath := strings.TrimSpace(parts[2])
				if filePath == "" {
					continue
				}

				filesByPath[filePath] = &domain.CompareFile{
					Path:         filePath,
					PreviousPath: previousPath,
					Status:       status,
				}
				continue
			}

			filePath := strings.TrimSpace(parts[1])
			if filePath == "" {
				continue
			}

			filesByPath[filePath] = &domain.CompareFile{
				Path:   filePath,
				Status: status,
			}
		}
	}

	numstatOutput, err := runGit("diff", "--numstat", commitRange)
	if err != nil {
		return nil, fmt.Errorf("failed to read compare diff stats: %w", err)
	}

	if strings.TrimSpace(numstatOutput) != "" {
		for _, line := range strings.Split(strings.TrimSpace(numstatOutput), "\n") {
			if strings.TrimSpace(line) == "" {
				continue
			}

			parts := strings.Split(line, "\t")
			if len(parts) < 3 {
				continue
			}

			additions := parseNumstatValue(parts[0])
			deletions := parseNumstatValue(parts[1])

			filePath := ""
			previousPath := ""

			if len(parts) >= 4 {
				previousPath = strings.TrimSpace(parts[2])
				filePath = strings.TrimSpace(parts[3])
			} else {
				rawPath := strings.TrimSpace(parts[2])
				parsedPrevious, parsedCurrent := parseRenamePath(rawPath)
				previousPath = parsedPrevious
				filePath = parsedCurrent
			}

			if filePath == "" {
				continue
			}

			file, exists := filesByPath[filePath]
			if !exists {
				file = &domain.CompareFile{
					Path:   filePath,
					Status: domain.CompareFileStatusModified,
				}
				filesByPath[filePath] = file
			}

			if file.PreviousPath == "" && previousPath != "" {
				file.PreviousPath = previousPath
			}

			if file.Status == domain.CompareFileStatusUnknown {
				file.Status = domain.CompareFileStatusModified
			}

			file.Additions = additions
			file.Deletions = deletions
		}
	}

	filePaths := make([]string, 0, len(filesByPath))
	for filePath := range filesByPath {
		filePaths = append(filePaths, filePath)
	}
	sort.Strings(filePaths)

	files := make([]domain.CompareFile, 0, len(filePaths))
	totalAdditions := 0
	totalDeletions := 0
	for _, filePath := range filePaths {
		file := filesByPath[filePath]
		patchOutput, patchErr := runGit("diff", "--unified=3", commitRange, "--", filePath)
		if patchErr == nil {
			const maxPatchLength = 24000
			if len(patchOutput) > maxPatchLength {
				patchOutput = patchOutput[:maxPatchLength] + "\n...diff truncated..."
			}
			file.Patch = patchOutput
		}

		totalAdditions += file.Additions
		totalDeletions += file.Deletions
		files = append(files, *file)
	}

	canCompare := len(commits) > 0 || len(files) > 0
	mergeable := false
	mergeMessage := "There isn't anything to compare."

	if canCompare {
		if _, err := runGit("checkout", "-B", "synergit-compare-base", baseHash); err == nil {
			mergeOutput, mergeErr := runGitRaw("merge", "--no-commit", "--no-ff", headHash)
			_, _ = runGitRaw("merge", "--abort")

			if mergeErr == nil {
				mergeable = true
				mergeMessage = "Able to merge. These branches can be automatically merged."
			} else if strings.Contains(strings.ToLower(mergeOutput), "conflict") {
				mergeable = false
				mergeMessage = "Can't automatically merge due to conflicts."
			} else {
				mergeable = false
				mergeMessage = "Unable to determine mergeability."
			}
		} else {
			mergeMessage = "Unable to determine mergeability."
		}
	}

	result.CanCompare = canCompare
	result.Mergeable = mergeable
	result.MergeMessage = mergeMessage
	result.Summary = domain.PullRequestCompareSummary{
		CommitCount:      len(commits),
		FilesChanged:     len(files),
		Additions:        totalAdditions,
		Deletions:        totalDeletions,
		ContributorCount: len(contributors),
	}
	result.Commits = commits
	result.Files = files

	return result, nil
}

func (g *LocalGitAdapter) MergeBranches(
	repoPath string, sourceBranch string, targetBranch string,
	mergerName string, commitMessage string,
) error {
	bareRepoPath := g.resolveRepoPath(repoPath)

	// 1. Create a temporary directory for the working tree
	tempDir, err := os.MkdirTemp("", "synergit-merge-*")
	if err != nil {
		return fmt.Errorf("failed to create temp merge directory: %w", err)
	}
	// Ensure cleanup happens no matter what
	defer os.RemoveAll(tempDir)

	// Helper function to run git commands inside the temp directory
	runGitCmd := func(args ...string) error {
		cmd := exec.Command("git", args...)
		cmd.Dir = tempDir

		var stderr bytes.Buffer
		cmd.Stderr = &stderr

		if err := cmd.Run(); err != nil {
			return fmt.Errorf("git %s failed: %s", args[0], stderr.String())
		}
		return nil
	}

	// 2. Clone the bare repository into the temp directory
	cloneCmd := exec.Command("git", "clone", bareRepoPath, tempDir)
	if err := cloneCmd.Run(); err != nil {
		return fmt.Errorf("failed to clone repo for merging: %w", err)
	}

	// 3. Configure Git user for the merge conflict
	// Git requires an email, so we generate a placeholder using the mergerName
	mergerEmail := fmt.Sprintf("%s@synergit.local", mergerName)
	if err := runGitCmd("config", "user.name", mergerName); err != nil {
		return err
	}
	if err := runGitCmd("config", "user.email", mergerEmail); err != nil {
		return err
	}

	// 4. Checkout the target branch
	if err := runGitCmd("checkout", targetBranch); err != nil {
		return fmt.Errorf("failed to checkout target branch: %w", err)
	}

	// 5. Perform the merge (--no-ff ensures a merge commit is always created, like GitHub does)
	err = runGitCmd("merge", "origin/"+sourceBranch, "--no-ff", "-m", commitMessage)
	if err != nil {
		lowerErr := strings.ToLower(err.Error())
		if strings.Contains(lowerErr, "conflict") {
			// Expected merge conflict path; FE will send user to resolver.
			return errors.New("merge conflict detected: cannot merge automatically")
		}

		// Non-conflict merge failures should not be reported as conflicts.
		return fmt.Errorf("failed to merge branches: %w", err)
	}

	// 6. Push the merged target branch back to the bare repository
	if err := runGitCmd("push", "origin", targetBranch); err != nil {
		return fmt.Errorf("failed to push merged branch: %w", err)
	}

	return nil
}

func (g *LocalGitAdapter) GetConflictingFiles(repoName string, sourceBranch string,
	targetBranch string) ([]string, error) {

	bareRepoPath := g.resolveRepoPath(repoName)
	tempDir, mkdirErr := os.MkdirTemp("", "synergit-conflict-check-*")
	if mkdirErr != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", mkdirErr)
	}
	defer os.RemoveAll(tempDir)

	runGit := func(args ...string) (string, error) {
		cmd := exec.Command("git", args...)
		cmd.Dir = tempDir
		out, err := cmd.CombinedOutput()
		return string(out), err
	}

	// Clone and prepare
	if cloneOut, cloneErr := runGit("clone", bareRepoPath, tempDir); cloneErr != nil {
		return nil, fmt.Errorf("failed to clone: %w: %s", cloneErr, strings.TrimSpace(cloneOut))
	}

	if chkoutOut, chkoutErr := runGit("checkout", "-B", targetBranch, "origin/"+targetBranch); chkoutErr != nil {
		return nil, fmt.Errorf("failed to checkout target: %w: %s", chkoutErr, strings.TrimSpace(chkoutOut))
	}

	// Attempt the merge: conflict case is expected to return non-zero, but other failures
	// (e.g. unknown branch) should surface as explicit errors.
	mergeOut, mergeErr := runGit("merge", "origin/"+sourceBranch, "--no-commit", "--no-ff")

	// Use index-level unmerged entries; this is more reliable than `git diff --diff-filter=U`.
	unmergedOut, unmergedErr := runGit("ls-files", "-u")
	if unmergedErr != nil {
		return nil, fmt.Errorf("failed to list unmerged files: %w: %s",
			unmergedErr, strings.TrimSpace(unmergedOut))
	}

	files := []string{}
	seen := map[string]bool{}
	lines := strings.Split(strings.TrimSpace(unmergedOut), "\n")
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}

		// Format: <mode> <sha> <stage>\t<path>
		parts := strings.SplitN(line, "\t", 2)
		if len(parts) != 2 {
			continue
		}

		file := strings.TrimSpace(parts[1])
		if file == "" || seen[file] {
			continue
		}

		seen[file] = true
		files = append(files, file)
	}

	if mergeErr != nil && len(files) == 0 {
		return nil, fmt.Errorf("merge failed before conflict detection: %w: %s",
			mergeErr, strings.TrimSpace(mergeOut))
	}

	return files, nil
}

func (g *LocalGitAdapter) GetConflictContent(repoName string, sourceBranch string,
	targetBranch string, filePath string) (string, error) {

	// Note: In a heavily optimized system, we should cache the temp dir state.
	// For now, doing a fresh clone is safest and ensures no state leakage.
	bareRepoPath := g.resolveRepoPath(repoName)
	tempDir, err := os.MkdirTemp("", "synergit-conflict-content-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	runGit := func(args ...string) (string, error) {
		cmd := exec.Command("git", args...)
		cmd.Dir = tempDir
		out, err := cmd.CombinedOutput()
		return string(out), err
	}

	if out, err := runGit("clone", bareRepoPath, tempDir); err != nil {
		return "", fmt.Errorf("failed to clone: %w: %s", err, strings.TrimSpace(out))
	}
	if out, err := runGit("checkout", "-B", targetBranch, "origin/"+targetBranch); err != nil {
		return "", fmt.Errorf("failed to checkout target: %w: %s", err, strings.TrimSpace(out))
	}

	// Trigger the conflict
	mergeOut, mergeErr := runGit("merge", "origin/"+sourceBranch, "--no-commit", "--no-ff")
	_ = mergeOut
	_ = mergeErr

	// Read the specific file that contains the Git conflict markers
	// (e.g., <<<<<<<, =======, >>>>>>>)
	fullPath := filepath.Join(tempDir, filePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to read conflicting file: %w", err)
	}

	return string(content), nil
}

func (g *LocalGitAdapter) ResolveConflictsAndCommit(repoName string, sourceBranch string,
	targetBranch string, resolverName string, commitMessage string,
	resolutions []domain.ConflictResolution) error {

	bareRepoPath := g.resolveRepoPath(repoName)
	tempDir, err := os.MkdirTemp("", "synergit-conflict-resolve-*")
	if err != nil {
		return fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	runGit := func(args ...string) error {
		cmd := exec.Command("git", args...)
		cmd.Dir = tempDir
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("git %s failed: %s", args[0], stderr.String())
		}
		return nil
	}

	// 1. Clone
	if err := runGit("clone", bareRepoPath, tempDir); err != nil {
		return err
	}

	// 2. Checkout the target branch. Resolutions should be committed on target,
	// preserving source branch history.
	if err := runGit("checkout", "-B", targetBranch, "origin/"+targetBranch); err != nil {
		return fmt.Errorf("failed to checkout target branch: %w", err)
	}

	// 3. Configure Git user
	resolverEmail := fmt.Sprintf("%s@synergit.local", resolverName)
	runGit("config", "user.name", resolverName)
	runGit("config", "user.email", resolverEmail)

	// 4. Trigger conflict by merging source into target.
	// This will fail with a conflict, which is exactly what we want.
	runGit("merge", "origin/"+sourceBranch, "--no-commit", "--no-ff")

	// 5. Overwrite the conflicted files with the user's resolved text
	for _, res := range resolutions {
		fullPath := filepath.Join(tempDir, res.Path)
		if err := os.WriteFile(fullPath, []byte(res.ResolvedContent), 0644); err != nil {
			return fmt.Errorf("failed to write resolved content to %s: %w",
				res.Path, err)
		}
		// Stage the resolved file
		if err := runGit("add", res.Path); err != nil {
			return err
		}
	}

	// 6. Complete the merge by committing the resolutions
	if err := runGit("commit", "-m", commitMessage); err != nil {
		return fmt.Errorf("failed to commit resolutions: %w", err)
	}

	// 7. Push the merged target branch back to the bare server.
	if err := runGit("push", "origin", targetBranch); err != nil {
		return fmt.Errorf("failed to push resolved branch: %w", err)
	}

	return nil
}
