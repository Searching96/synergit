package repository

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path" // Use path instead filepath to guarantee forward slashes (/)
	"path/filepath"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

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

func (g *LocalGitAdapter) GetCommits(repoPath string, branch string) ([]domain.Commit,
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

	// 3. Get the commit iterator starting from HEAD
	commitIter, err := r.Log(&git.LogOptions{From: ref.Hash()})
	if err != nil {
		return nil, err
	}

	var commits []domain.Commit

	// 4. Loop through the commits and map them to our Domain struct
	err = commitIter.ForEach(func(c *object.Commit) error {
		commits = append(commits, domain.Commit{
			Hash:   c.Hash.String(),
			Author: c.Author.Name,
			// Clean up the message (sometimes t hey have trailing newlines)
			Message: strings.TrimSpace(c.Message),
			Date:    c.Author.When,
		})

		// Note: If we have massive repos, we might want to break this loop
		// after 50 or 100 commits to implement pagination later.
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to iterate commits: %w", err)
	}

	return commits, nil
}

func getBranchRef(r *git.Repository, branch string) (*plumbing.Reference, error) {
	if branch == "" {
		return r.Head()
	}
	return r.Reference(plumbing.ReferenceName("refs/heads/"+branch), true)
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

	if strings.TrimSpace(newBranch) == "" {
		return nil, errors.New("branch name cannot be empty")
	}

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

	if strings.TrimSpace(branch) == "" {
		return errors.New("branch is required")
	}

	if strings.TrimSpace(filePath) == "" {
		return errors.New("file path is required")
	}

	if strings.TrimSpace(commitMessage) == "" {
		return errors.New("commit message is required")
	}

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
