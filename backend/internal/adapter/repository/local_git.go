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
	"sync"
	"synergit/internal/core/boundary/output"
	"synergit/internal/core/domain"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// --- Compile-time interface check ---
// If LocalGitAdapter ever fails to implement output.GitManager,
// the compiler will throw an error exactly on this line.
var _ output.GitManager = (*LocalGitAdapter)(nil)

// LocalGitAdapter implements output.GitManager using the local OS
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

// InitBareRepo satisfies the output.GitManager interface
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

func (g *LocalGitAdapter) CloneBareRepo(sourcePath string, targetPath string, branch string) (string, error) {
	fullSourcePath := g.resolveRepoPath(sourcePath)
	fullTargetPath := g.resolveRepoPath(targetPath)

	if _, err := os.Stat(fullTargetPath); !os.IsNotExist(err) {
		return "", fmt.Errorf("repository %s already exists", targetPath)
	}

	if err := os.MkdirAll(filepath.Dir(fullTargetPath), 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	args := []string{"clone", "--bare"}
	if branch != "" {
		args = append(args, "--branch", branch, "--single-branch")
	}
	args = append(args, fullSourcePath, fullTargetPath)

	cmd := exec.Command("git", args...)
	if output, err := cmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("git clone bare failed: %s: %w", string(output), err)
	}

	return fullTargetPath, nil
}

func (g *LocalGitAdapter) DeleteRepository(repoPath string) error {
	fullPath := g.resolveRepoPath(repoPath)
	absRepoPath, err := filepath.Abs(fullPath)
	if err != nil {
		return fmt.Errorf("failed to resolve repository path: %w", err)
	}

	absStorageRoot, err := filepath.Abs(g.storageRoot)
	if err != nil {
		return fmt.Errorf("failed to resolve storage root: %w", err)
	}

	relPath, err := filepath.Rel(absStorageRoot, absRepoPath)
	if err != nil {
		return fmt.Errorf("failed to validate repository path: %w", err)
	}
	if relPath == "." || strings.HasPrefix(relPath, "..") || filepath.IsAbs(relPath) {
		return errors.New("repository path is outside git storage root")
	}

	if _, err := os.Stat(absRepoPath); os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return fmt.Errorf("failed to inspect repository path: %w", err)
	}

	if err := os.RemoveAll(absRepoPath); err != nil {
		return fmt.Errorf("failed to delete repository files: %w", err)
	}

	return nil
}

func (g *LocalGitAdapter) RenameRepository(repoPath string, newName string) (string, error) {
	cleanName := strings.TrimSpace(newName)
	if cleanName == "" || strings.ContainsAny(cleanName, "/\\") || strings.Contains(cleanName, "..") {
		return "", errors.New("invalid repository name")
	}

	oldFull, err := filepath.Abs(g.resolveRepoPath(repoPath))
	if err != nil {
		return "", fmt.Errorf("failed to resolve repository path: %w", err)
	}

	absStorageRoot, err := filepath.Abs(g.storageRoot)
	if err != nil {
		return "", fmt.Errorf("failed to resolve storage root: %w", err)
	}

	newFull := filepath.Join(filepath.Dir(oldFull), cleanName+".git")

	for _, p := range []string{oldFull, newFull} {
		rel, relErr := filepath.Rel(absStorageRoot, p)
		if relErr != nil || rel == "." || strings.HasPrefix(rel, "..") || filepath.IsAbs(rel) {
			return "", errors.New("repository path is outside git storage root")
		}
	}

	if _, err := os.Stat(newFull); !os.IsNotExist(err) {
		return "", errors.New("a repository with this name already exists")
	}

	if err := os.Rename(oldFull, newFull); err != nil {
		return "", fmt.Errorf("failed to rename repository files: %w", err)
	}

	return newFull, nil
}

func (g *LocalGitAdapter) RenameUserStorage(oldUsername, newUsername string) error {
	oldPath := filepath.Join(g.storageRoot, oldUsername)
	newPath := filepath.Join(g.storageRoot, newUsername)
	if _, err := os.Stat(oldPath); err == nil {
		if err := os.Rename(oldPath, newPath); err != nil {
			return fmt.Errorf("failed to rename user storage directory: %w", err)
		}
	}
	return nil
}

func (g *LocalGitAdapter) BootstrapRepository(repoPath string, branch string,
	authorName string, authorEmail string, files map[string]string, commitMessage string) error {

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
	requestPayload output.ByteReader, responseWriter output.ByteWriter) error {

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
	requestPayload output.ByteReader, responseWriter output.ByteWriter) error {

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

func (g *LocalGitAdapter) GetCommits(repoPath string, branch string, pathFilter string, limit int, offset int) (domain.CommitPage, error) {

	fullPath := g.resolveRepoPath(repoPath)

	// 1. Open the repository
	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return domain.CommitPage{}, fmt.Errorf("failed to open repo: %w", err)
	}

	// 2. Get HEAD
	ref, err := getBranchRef(r, branch)
	if err != nil {
		if err == plumbing.ErrReferenceNotFound {
			// Branch is empty, no commits yet
			return domain.CommitPage{Commits: []domain.Commit{}, TotalCommits: 0}, nil
		}
		// Other errors except empty repo error
		return domain.CommitPage{}, err
	}

	return getCommitsWithRef(r, ref.Hash(), pathFilter, limit, offset)
}

func (g *LocalGitAdapter) GetCommitStats(repoPath string, branch string, pathFilter string) (domain.CommitStats, error) {
	fullPath := g.resolveRepoPath(repoPath)

	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return domain.CommitStats{}, fmt.Errorf("failed to open repo: %w", err)
	}

	ref, err := getBranchRef(r, branch)
	if err != nil {
		if err == plumbing.ErrReferenceNotFound {
			return domain.CommitStats{}, nil
		}
		return domain.CommitStats{}, err
	}

	return getCommitStatsWithRef(r, ref.Hash(), pathFilter)
}

func (g *LocalGitAdapter) GetCommitsBatch(repoPath string, branch string, paths []string) (map[string]*domain.Commit, error) {
	fullPath := g.resolveRepoPath(repoPath)

	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repo: %w", err)
	}

	ref, err := getBranchRef(r, branch)
	if err != nil {
		if err == plumbing.ErrReferenceNotFound {
			return map[string]*domain.Commit{}, nil
		}
		return nil, err
	}

	result := make(map[string]*domain.Commit)
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Limit concurrency to 10 to avoid overwhelming the system
	sem := make(chan struct{}, 10)

	refHash := ref.Hash()

	for _, p := range paths {
		wg.Add(1)
		sem <- struct{}{}
		go func(pathFilter string) {
			defer wg.Done()
			defer func() { <-sem }()

			// Open an independent instance for each goroutine to avoid go-git thread-safe contention
			localRepo, err := git.PlainOpen(fullPath)
			if err != nil {
				return
			}

			commitsPage, err := getCommitsWithRef(localRepo, refHash, pathFilter, 1, 0)

			mu.Lock()
			defer mu.Unlock()

			if err == nil && len(commitsPage.Commits) > 0 {
				commitCopy := commitsPage.Commits[0]
				result[pathFilter] = &commitCopy
			} else {
				result[pathFilter] = nil
			}
		}(p)
	}

	wg.Wait()
	return result, nil
}

func getCommitStatsWithRef(r *git.Repository, refHash plumbing.Hash, pathFilter string) (domain.CommitStats, error) {
	normalizedPath := normalizeCommitPath(pathFilter)
	if normalizedPath == "" {
		return countCommits(r, &git.LogOptions{From: refHash, Order: git.LogOrderCommitterTime})
	}

	isDirectory, err := isDirectoryPathAtRef(r, refHash, normalizedPath)
	if err != nil {
		return domain.CommitStats{}, err
	}

	if isDirectory {
		return countDirectoryCommits(r, refHash, normalizedPath)
	}

	return countCommits(r, &git.LogOptions{
		From:     refHash,
		FileName: &normalizedPath,
		Order:    git.LogOrderCommitterTime,
	})
}

func countCommits(r *git.Repository, logOptions *git.LogOptions) (domain.CommitStats, error) {
	commitIter, err := r.Log(logOptions)
	if err != nil {
		return domain.CommitStats{}, err
	}
	defer commitIter.Close()

	var stats domain.CommitStats

	err = commitIter.ForEach(func(c *object.Commit) error {
		if stats.TotalCommits == 0 {
			mapped := mapToDomainCommit(c)
			stats.LatestCommit = &mapped
		}
		stats.TotalCommits++
		return nil
	})
	if err != nil {
		return domain.CommitStats{}, fmt.Errorf("failed to iterate commits: %w", err)
	}

	return stats, nil
}

func countDirectoryCommits(r *git.Repository, refHash plumbing.Hash,
	normalizedDirPath string) (domain.CommitStats, error) {

	commitIter, err := r.Log(&git.LogOptions{From: refHash, Order: git.LogOrderCommitterTime})
	if err != nil {
		return domain.CommitStats{}, err
	}
	defer commitIter.Close()

	prefix := normalizedDirPath + "/"
	var stats domain.CommitStats

	err = commitIter.ForEach(func(c *object.Commit) error {
		touchesDirectory, statsErr := commitTouchesDirectory(c, normalizedDirPath, prefix)
		if statsErr != nil {
			return statsErr
		}
		if !touchesDirectory {
			return nil
		}

		if stats.TotalCommits == 0 {
			mapped := mapToDomainCommit(c)
			stats.LatestCommit = &mapped
		}
		stats.TotalCommits++
		return nil
	})
	if err != nil {
		return domain.CommitStats{}, fmt.Errorf("failed to count commits for directory %q: %w", normalizedDirPath, err)
	}

	return stats, nil
}

func getCommitsWithRef(r *git.Repository, refHash plumbing.Hash, pathFilter string, limit int, offset int) (domain.CommitPage, error) {
	normalizedPath := normalizeCommitPath(pathFilter)
	if normalizedPath == "" {
		return listCommits(r, &git.LogOptions{From: refHash, Order: git.LogOrderCommitterTime}, limit, offset)
	}

	isDirectory, err := isDirectoryPathAtRef(r, refHash, normalizedPath)
	if err != nil {
		return domain.CommitPage{}, err
	}

	if isDirectory {
		return listDirectoryCommits(r, refHash, normalizedPath, limit, offset)
	}

	return listCommits(r, &git.LogOptions{
		From:     refHash,
		FileName: &normalizedPath,
		Order:    git.LogOrderCommitterTime,
	}, limit, offset)
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

func listCommits(r *git.Repository, logOptions *git.LogOptions, limit int, offset int) (domain.CommitPage, error) {
	commitIter, err := r.Log(logOptions)
	if err != nil {
		return domain.CommitPage{}, err
	}
	defer commitIter.Close()

	var commits []domain.Commit
	total := 0

	err = commitIter.ForEach(func(c *object.Commit) error {
		if total >= offset && len(commits) < limit {
			commits = append(commits, mapToDomainCommit(c))
		}
		total++
		return nil
	})
	if err != nil {
		return domain.CommitPage{}, fmt.Errorf("failed to iterate commits: %w", err)
	}

	return domain.CommitPage{
		Commits:      commits,
		TotalCommits: total,
	}, nil
}

func mapToDomainCommit(c *object.Commit) domain.Commit {
	parents := make([]string, 0, c.NumParents())
	for _, parent := range c.ParentHashes {
		parents = append(parents, parent.String())
	}

	return domain.Commit{
		Hash:    c.Hash.String(),
		Author:  c.Author.Name,
		Message: strings.TrimSpace(c.Message),
		Date:    c.Author.When,
		Parents: parents,
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
	normalizedDirPath string, limit int, offset int) (domain.CommitPage, error) {

	commitIter, err := r.Log(&git.LogOptions{From: refHash, Order: git.LogOrderCommitterTime})
	if err != nil {
		return domain.CommitPage{}, err
	}
	defer commitIter.Close()

	prefix := normalizedDirPath + "/"
	var commits []domain.Commit
	total := 0

	err = commitIter.ForEach(func(c *object.Commit) error {
		touchesDirectory, statsErr := commitTouchesDirectory(c, normalizedDirPath, prefix)
		if statsErr != nil {
			return statsErr
		}
		if !touchesDirectory {
			return nil
		}

		if total >= offset && len(commits) < limit {
			commits = append(commits, mapToDomainCommit(c))
		}
		total++
		return nil
	})
	if err != nil {
		return domain.CommitPage{}, fmt.Errorf("failed to iterate commits for directory %q: %w", normalizedDirPath, err)
	}

	return domain.CommitPage{
		Commits:      commits,
		TotalCommits: total,
	}, nil
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
	defaultHash := plumbing.ZeroHash
	if headRef != nil {
		headBranchName = headRef.Name().Short()
		defaultHash = headRef.Hash()
	}

	iter, err := r.Branches()
	if err != nil {
		return nil, err
	}

	var branches []domain.Branch
	err = iter.ForEach(func(ref *plumbing.Reference) error {
		branchName := ref.Name().Short()
		isDefault := branchName == headBranchName

		b := domain.Branch{
			Name:       branchName,
			CommitHash: ref.Hash().String(),
			IsDefault:  isDefault,
		}

		// Last commit author + date
		if commit, err := r.CommitObject(ref.Hash()); err == nil {
			b.LastAuthor = commit.Author.Name
			b.LastUpdated = commit.Author.When
		}

		// Behind/ahead vs default branch (skip for default itself)
		if !isDefault && defaultHash != plumbing.ZeroHash {
			behind, ahead := countBehindAhead(fullPath, defaultHash.String(), ref.Hash().String())
			b.BehindCount = behind
			b.AheadCount = ahead
		}

		branches = append(branches, b)
		return nil
	})

	return branches, err
}

// countBehindAhead returns (behind, ahead) for branchHash relative to baseHash.
// behind = commits in base not in branch, ahead = commits in branch not in base.
func countBehindAhead(repoPath, baseHash, branchHash string) (int, int) {
	count := func(rangeSpec string) int {
		cmd := exec.Command("git", "rev-list", "--count", rangeSpec)
		cmd.Dir = repoPath
		var out bytes.Buffer
		cmd.Stdout = &out
		if err := cmd.Run(); err != nil {
			return 0
		}
		n, _ := strconv.Atoi(strings.TrimSpace(out.String()))
		return n
	}
	behind := count(branchHash + ".." + baseHash)
	ahead := count(baseHash + ".." + branchHash)
	return behind, ahead
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

func (g *LocalGitAdapter) RenameBranch(repoPath string, oldBranch string,
	newBranch string) (*domain.Branch, error) {

	fullPath := g.resolveRepoPath(repoPath)
	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repo: %w", err)
	}

	oldRefName := plumbing.NewBranchReferenceName(strings.TrimSpace(oldBranch))
	oldRef, err := r.Reference(oldRefName, true)
	if err != nil {
		return nil, fmt.Errorf("branch not found: %w", err)
	}

	newRefName := plumbing.NewBranchReferenceName(strings.TrimSpace(newBranch))
	if err := newRefName.Validate(); err != nil {
		return nil, fmt.Errorf("invalid branch name: %w", err)
	}

	if newRefName == oldRefName {
		return nil, errors.New("new branch name must be different")
	}

	if _, err := r.Reference(newRefName, true); err == nil {
		return nil, errors.New("branch already exists")
	} else if err != plumbing.ErrReferenceNotFound {
		return nil, err
	}

	if err := r.Storer.SetReference(plumbing.NewHashReference(newRefName, oldRef.Hash())); err != nil {
		return nil, fmt.Errorf("failed to create branch: %w", err)
	}

	// If the renamed branch is the default branch, retarget HEAD before
	// removing the old ref so the repository keeps a valid default.
	headRef, _ := r.Head()
	isDefault := headRef != nil && headRef.Name() == oldRefName
	if isDefault {
		if err := r.Storer.SetReference(plumbing.NewSymbolicReference(plumbing.HEAD, newRefName)); err != nil {
			return nil, fmt.Errorf("failed to update HEAD: %w", err)
		}
	}

	if err := r.Storer.RemoveReference(oldRefName); err != nil {
		return nil, fmt.Errorf("failed to remove old branch: %w", err)
	}

	return &domain.Branch{
		Name:       newBranch,
		CommitHash: oldRef.Hash().String(),
		IsDefault:  isDefault,
	}, nil
}

func (g *LocalGitAdapter) DeleteBranch(repoPath string, branchName string) error {
	fullPath := g.resolveRepoPath(repoPath)
	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return fmt.Errorf("failed to open repo: %w", err)
	}

	refName := plumbing.NewBranchReferenceName(branchName)

	// Refuse to delete the default branch (HEAD target).
	if headRef, err := r.Head(); err == nil && headRef.Name() == refName {
		return errors.New("cannot delete the default branch")
	}

	if _, err := r.Reference(refName, false); err != nil {
		if err == plumbing.ErrReferenceNotFound {
			return errors.New("branch not found")
		}
		return err
	}

	if err := r.Storer.RemoveReference(refName); err != nil {
		return fmt.Errorf("failed to delete branch: %w", err)
	}

	return nil
}

func (g *LocalGitAdapter) CommitFileChange(repoPath string, branch string,
	filePath string, oldFilePath string, content string, authorName string, authorEmail string, commitMessage string) error {

	bareRepoPath := g.resolveRepoPath(repoPath)

	cleanPath := filepath.Clean(filepath.FromSlash(filePath))
	if cleanPath == "." || filepath.IsAbs(cleanPath) {
		return errors.New("invalid file path")
	}

	tempIndexFile, err := os.CreateTemp("", "synergit-index-*")
	if err != nil {
		return fmt.Errorf("failed to create temp index file: %w", err)
	}
	tempIndexPath := tempIndexFile.Name()
	tempIndexFile.Close()
	defer os.Remove(tempIndexPath)

	runGit := func(args ...string) (string, error) {
		cmd := exec.Command("git", args...)
		cmd.Dir = bareRepoPath
		cmd.Env = append(os.Environ(),
			"GIT_DIR="+bareRepoPath,
			"GIT_INDEX_FILE="+tempIndexPath,
			"GIT_AUTHOR_NAME="+authorName,
			"GIT_AUTHOR_EMAIL="+authorEmail,
			"GIT_COMMITTER_NAME="+authorName,
			"GIT_COMMITTER_EMAIL="+authorEmail,
		)
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return "", fmt.Errorf("git %s failed: %s", args[0], strings.TrimSpace(stderr.String()))
		}
		return strings.TrimSpace(stdout.String()), nil
	}

	var treeToRead string
	if _, err := runGit("rev-parse", "--verify", branch); err == nil {
		treeToRead = branch
	} else if _, err := runGit("rev-parse", "--verify", "HEAD"); err == nil {
		treeToRead = "HEAD"
	}

	if treeToRead != "" {
		if _, err := runGit("read-tree", treeToRead); err != nil {
			return err
		}
	}

	mode := "100644"
	if oldFilePath != "" && oldFilePath != filePath {
		cleanOldPath := filepath.Clean(filepath.FromSlash(oldFilePath))
		if cleanOldPath != "." && !filepath.IsAbs(cleanOldPath) {
			lsOut, err := runGit("ls-files", "-s", cleanOldPath)
			if err == nil && lsOut != "" {
				parts := strings.Fields(lsOut)
				if len(parts) >= 1 {
					mode = parts[0]
				}
			}
			_, _ = runGit("rm", "--cached", cleanOldPath)
		}
	} else if oldFilePath != "" && oldFilePath == filePath {
		lsOut, err := runGit("ls-files", "-s", cleanPath)
		if err == nil && lsOut != "" {
			parts := strings.Fields(lsOut)
			if len(parts) >= 1 {
				mode = parts[0]
			}
		}
	}

	cmdBlob := exec.Command("git", "hash-object", "-w", "--stdin")
	cmdBlob.Dir = bareRepoPath
	cmdBlob.Env = append(os.Environ(), "GIT_DIR="+bareRepoPath)
	cmdBlob.Stdin = strings.NewReader(content)
	var stdoutBlob, stderrBlob bytes.Buffer
	cmdBlob.Stdout = &stdoutBlob
	cmdBlob.Stderr = &stderrBlob
	if err := cmdBlob.Run(); err != nil {
		return fmt.Errorf("git hash-object failed: %s", strings.TrimSpace(stderrBlob.String()))
	}
	blobSha := strings.TrimSpace(stdoutBlob.String())

	if _, err := runGit("update-index", "--add", "--cacheinfo", mode+","+blobSha+","+cleanPath); err != nil {
		return err
	}

	treeSha, err := runGit("write-tree")
	if err != nil {
		return err
	}

	commitArgs := []string{"commit-tree", treeSha, "-m", commitMessage}
	if treeToRead != "" {
		parentCommit, err := runGit("rev-parse", "--verify", treeToRead)
		if err == nil {
			commitArgs = append(commitArgs, "-p", parentCommit)
		}
	}

	commitSha, err := runGit(commitArgs...)
	if err != nil {
		return err
	}

	if _, err := runGit("update-ref", "refs/heads/"+branch, commitSha); err != nil {
		return err
	}

	return nil
}

func (g *LocalGitAdapter) CommitFilesChange(repoPath string, branch string,
	files map[string]string, authorName string, authorEmail string, commitMessage string) error {

	bareRepoPath := g.resolveRepoPath(repoPath)

	tempIndexFile, err := os.CreateTemp("", "synergit-index-many-*")
	if err != nil {
		return fmt.Errorf("failed to create temp index file: %w", err)
	}
	tempIndexPath := tempIndexFile.Name()
	tempIndexFile.Close()
	defer os.Remove(tempIndexPath)

	runGit := func(args ...string) (string, error) {
		cmd := exec.Command("git", args...)
		cmd.Dir = bareRepoPath
		cmd.Env = append(os.Environ(),
			"GIT_DIR="+bareRepoPath,
			"GIT_INDEX_FILE="+tempIndexPath,
			"GIT_AUTHOR_NAME="+authorName,
			"GIT_AUTHOR_EMAIL="+authorEmail,
			"GIT_COMMITTER_NAME="+authorName,
			"GIT_COMMITTER_EMAIL="+authorEmail,
		)
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return "", fmt.Errorf("git %s failed: %s", args[0], strings.TrimSpace(stderr.String()))
		}
		return strings.TrimSpace(stdout.String()), nil
	}

	var treeToRead string
	if _, err := runGit("rev-parse", "--verify", branch); err == nil {
		treeToRead = branch
	} else if _, err := runGit("rev-parse", "--verify", "HEAD"); err == nil {
		treeToRead = "HEAD"
	}

	if treeToRead != "" {
		if _, err := runGit("read-tree", treeToRead); err != nil {
			return err
		}
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

		mode := "100644"
		lsOut, err := runGit("ls-files", "-s", cleanPath)
		if err == nil && lsOut != "" {
			parts := strings.Fields(lsOut)
			if len(parts) >= 1 {
				mode = parts[0]
			}
		}

		cmdBlob := exec.Command("git", "hash-object", "-w", "--stdin")
		cmdBlob.Dir = bareRepoPath
		cmdBlob.Env = append(os.Environ(), "GIT_DIR="+bareRepoPath)
		cmdBlob.Stdin = strings.NewReader(files[filePath])
		var stdoutBlob, stderrBlob bytes.Buffer
		cmdBlob.Stdout = &stdoutBlob
		cmdBlob.Stderr = &stderrBlob
		if err := cmdBlob.Run(); err != nil {
			return fmt.Errorf("git hash-object failed: %s", strings.TrimSpace(stderrBlob.String()))
		}
		blobSha := strings.TrimSpace(stdoutBlob.String())

		if _, err := runGit("update-index", "--add", "--cacheinfo", mode+","+blobSha+","+cleanPath); err != nil {
			return err
		}
	}

	treeSha, err := runGit("write-tree")
	if err != nil {
		return err
	}

	commitArgs := []string{"commit-tree", treeSha, "-m", commitMessage}
	if treeToRead != "" {
		parentCommit, err := runGit("rev-parse", "--verify", treeToRead)
		if err == nil {
			commitArgs = append(commitArgs, "-p", parentCommit)
		}
	}

	commitSha, err := runGit(commitArgs...)
	if err != nil {
		return err
	}

	if _, err := runGit("update-ref", "refs/heads/"+branch, commitSha); err != nil {
		return err
	}

	return nil
}

func (g *LocalGitAdapter) DeletePath(repoPath string, branch string,
	path string, authorName string, authorEmail string, commitMessage string) error {

	bareRepoPath := g.resolveRepoPath(repoPath)

	cleanPath := filepath.Clean(filepath.FromSlash(path))
	if cleanPath == "." || filepath.IsAbs(cleanPath) {
		return errors.New("invalid file path")
	}

	tempIndexFile, err := os.CreateTemp("", "synergit-index-delete-*")
	if err != nil {
		return fmt.Errorf("failed to create temp index file: %w", err)
	}
	tempIndexPath := tempIndexFile.Name()
	tempIndexFile.Close()
	defer os.Remove(tempIndexPath)

	runGit := func(args ...string) (string, error) {
		cmd := exec.Command("git", args...)
		cmd.Dir = bareRepoPath
		cmd.Env = append(os.Environ(),
			"GIT_DIR="+bareRepoPath,
			"GIT_INDEX_FILE="+tempIndexPath,
			"GIT_AUTHOR_NAME="+authorName,
			"GIT_AUTHOR_EMAIL="+authorEmail,
			"GIT_COMMITTER_NAME="+authorName,
			"GIT_COMMITTER_EMAIL="+authorEmail,
		)
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return "", fmt.Errorf("git %s failed: %s", args[0], strings.TrimSpace(stderr.String()))
		}
		return strings.TrimSpace(stdout.String()), nil
	}

	var treeToRead string
	if _, err := runGit("rev-parse", "--verify", branch); err == nil {
		treeToRead = branch
	} else {
		return fmt.Errorf("branch %s does not exist", branch)
	}

	if _, err := runGit("read-tree", treeToRead); err != nil {
		return err
	}

	if _, err := runGit("rm", "--cached", "-r", "--ignore-unmatch", cleanPath); err != nil {
		return err
	}

	treeSha, err := runGit("write-tree")
	if err != nil {
		return err
	}

	parentCommit, err := runGit("rev-parse", "--verify", treeToRead)
	if err != nil {
		return err
	}

	commitSha, err := runGit("commit-tree", treeSha, "-p", parentCommit, "-m", commitMessage)
	if err != nil {
		return err
	}

	if _, err := runGit("update-ref", "refs/heads/"+branch, commitSha); err != nil {
		return err
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

func (g *LocalGitAdapter) MergeBranches(repoPath string, sourceBranch string, targetBranch string,
	mergerName string, mergerEmail string, commitMessage string) error {
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

	// 3. Configure Git user
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

func (g *LocalGitAdapter) CreateRevertBranch(repoPath string, targetBranch string, revertBranch string,
	mergeCommitHash string, authorName string, authorEmail string, commitMessage string) error {

	bareRepoPath := g.resolveRepoPath(repoPath)
	tempDir, err := os.MkdirTemp("", "synergit-revert-*")
	if err != nil {
		return fmt.Errorf("failed to create temp revert directory: %w", err)
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
		return fmt.Errorf("failed to clone repo for revert: %w", err)
	}

	if err := runGit("checkout", "-B", revertBranch, "origin/"+targetBranch); err != nil {
		return fmt.Errorf("failed to create revert branch: %w", err)
	}

	if err := runGit("config", "user.name", authorName); err != nil {
		return err
	}
	if err := runGit("config", "user.email", authorEmail); err != nil {
		return err
	}

	if err := runGit("revert", "-m", "1", "--no-commit", mergeCommitHash); err != nil {
		return fmt.Errorf("failed to revert merge commit: %w", err)
	}

	if err := runGit("commit", "-m", commitMessage); err != nil {
		return fmt.Errorf("failed to commit revert: %w", err)
	}

	if err := runGit("push", "origin", revertBranch); err != nil {
		return fmt.Errorf("failed to push revert branch: %w", err)
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

	if chkoutOut, chkoutErr := runGit("checkout", "-B", sourceBranch, "origin/"+sourceBranch); chkoutErr != nil {
		return nil, fmt.Errorf("failed to checkout source: %w: %s", chkoutErr, strings.TrimSpace(chkoutOut))
	}

	// Attempt the merge: conflict case is expected to return non-zero, but other failures
	// (e.g. unknown branch) should surface as explicit errors.
	mergeOut, mergeErr := runGit("merge", "origin/"+targetBranch, "--no-commit", "--no-ff")

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
	if out, err := runGit("checkout", "-B", sourceBranch, "origin/"+sourceBranch); err != nil {
		return "", fmt.Errorf("failed to checkout source: %w: %s", err, strings.TrimSpace(out))
	}

	// Trigger the conflict
	mergeOut, mergeErr := runGit("merge", "origin/"+targetBranch, "--no-commit", "--no-ff")
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

func (g *LocalGitAdapter) ResolveConflictsAndCommit(repoPath string, sourceBranch string,
	targetBranch string, resolverName string, resolverEmail string, commitMessage string,
	resolutions []domain.ConflictResolution) error {

	bareRepoPath := g.resolveRepoPath(repoPath)
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

	// 2. Checkout the source branch. GitHub commits conflict resolutions to
	// the pull request branch so it can be merged cleanly afterward.
	if err := runGit("checkout", "-B", sourceBranch, "origin/"+sourceBranch); err != nil {
		return fmt.Errorf("failed to checkout source branch: %w", err)
	}

	// 3. Configure Git user
	runGit("config", "user.name", resolverName)
	runGit("config", "user.email", resolverEmail)

	// 4. Trigger conflict by merging target into source.
	// This will fail with a conflict, which is exactly what we want.
	runGit("merge", "origin/"+targetBranch, "--no-commit", "--no-ff")

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

	// 7. Push the resolved source branch back to the bare server.
	if err := runGit("push", "origin", sourceBranch); err != nil {
		return fmt.Errorf("failed to push resolved branch: %w", err)
	}

	return nil
}

func (g *LocalGitAdapter) GetCommitDetail(repoPath string, commitHash string) (*domain.Commit, error) {
	fullPath := g.resolveRepoPath(repoPath)
	r, err := git.PlainOpen(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repo: %w", err)
	}

	hash := plumbing.NewHash(commitHash)
	commit, err := r.CommitObject(hash)
	if err != nil {
		return nil, fmt.Errorf("commit not found: %w", err)
	}

	mapped := mapToDomainCommit(commit)
	return &mapped, nil
}

func (g *LocalGitAdapter) GetCommitDiff(repoPath string, commitHash string) ([]domain.DiffFile, error) {
	fullPath := g.resolveRepoPath(repoPath)

	// Use git diff-tree to get the list of changed files with stats and patch
	cmd := exec.Command("git", "diff-tree", "-p", "--no-commit-id", "--numstat", "-r", commitHash)
	cmd.Dir = fullPath
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("git diff-tree failed: %w", err)
	}

	// Use git show --stat for file stats, and git show -p for patch per file
	// Simpler: use git show --format="" --patch --numstat
	statsCmd := exec.Command("git", "show", "--format=", "--numstat", "-m", "--first-parent", commitHash)
	statsCmd.Dir = fullPath
	var statsOut bytes.Buffer
	statsCmd.Stdout = &statsOut
	if err := statsCmd.Run(); err != nil {
		return nil, fmt.Errorf("git show --numstat failed: %w", err)
	}

	// Parse numstat: "additions\tdeletions\tfilepath"
	type fileStat struct {
		additions int
		deletions int
		path      string
	}
	var stats []fileStat
	for _, line := range strings.Split(strings.TrimSpace(statsOut.String()), "\n") {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "\t", 3)
		if len(parts) < 3 {
			continue
		}
		add, _ := strconv.Atoi(parts[0])
		del, _ := strconv.Atoi(parts[1])
		stats = append(stats, fileStat{additions: add, deletions: del, path: parts[2]})
	}

	// Get the unified diff patch
	patchCmd := exec.Command("git", "show", "--format=", "-p", "-m", "--first-parent", commitHash)
	patchCmd.Dir = fullPath
	var patchOut bytes.Buffer
	patchCmd.Stdout = &patchOut
	if err := patchCmd.Run(); err != nil {
		return nil, fmt.Errorf("git show -p failed: %w", err)
	}

	// Split patches by "diff --git" boundaries
	patchText := patchOut.String()
	patches := splitDiffByFile(patchText)

	// Build result
	result := make([]domain.DiffFile, 0, len(stats))
	for i, s := range stats {
		patch := ""
		if i < len(patches) {
			patch = patches[i]
		}
		result = append(result, domain.DiffFile{
			Path:      s.path,
			Additions: s.additions,
			Deletions: s.deletions,
			Patch:     patch,
		})
	}

	return result, nil
}

func splitDiffByFile(patch string) []string {
	const marker = "diff --git "
	var result []string
	parts := strings.Split(patch, marker)
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}
	return result
}
