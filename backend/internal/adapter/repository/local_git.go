package repository

import (
	"bytes"
	"errors"
	"fmt"
	"io"
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

// InitBareRepo satisfies the port.GitManager interface
func (g *LocalGitAdapter) InitBareRepo(repoName string) (string, error) {
	fullPath := filepath.Join(g.storageRoot, repoName+".git")

	if _, err := os.Stat(fullPath); !os.IsNotExist(err) {
		return "", fmt.Errorf("repository %s already exists", repoName)
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

func (g *LocalGitAdapter) AdvertiseRefs(repoName string, service string) ([]byte, error) {
	fullPath := filepath.Join(g.storageRoot, repoName+".git")

	// The client asks for "git-upload-pack", but the command is just "upload-pack"
	cmdName := strings.TrimPrefix(service, "git-")

	// --stateless-rpc tells git we are over HTTP, not SSH
	cmd := exec.Command("git", cmdName, "--stateless-rpc", "--advertise-refs", fullPath)
	return cmd.Output()
}

func (g *LocalGitAdapter) UploadPack(repoName string, reqBody io.Reader, resWriter io.Writer) error {
	fullPath := filepath.Join(g.storageRoot, repoName+".git")
	cmd := exec.Command("git", "upload-pack", "--stateless-rpc", fullPath)

	// Magic of Go: Pipe the HTTP request body directly to the Git command's input
	cmd.Stdin = reqBody
	// Pipe the Git command's output directly to the HTTP response
	cmd.Stdout = resWriter

	return cmd.Run()
}

// Process incoming git pushes
func (g *LocalGitAdapter) ReceivePack(repoName string, reqBody io.Reader, resWriter io.Writer) error {
	fullPath := filepath.Join(g.storageRoot, repoName+".git")

	cmd := exec.Command("git", "receive-pack", "--stateless-rpc", fullPath)

	// Stream the incoming code directly into Git
	cmd.Stdin = reqBody

	// Stream Git's acknowledgement back to the HTTP response
	cmd.Stdout = resWriter

	return cmd.Run()
}

func (g *LocalGitAdapter) GetTree(repoName string, requestPath string, branch string) ([]domain.RepoFile, error) {
	fullPath := filepath.Join(g.storageRoot, repoName+".git")

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
		nodeType := "file"
		if !entry.Mode.IsFile() {
			nodeType = "dir"
		}

		files = append(files, domain.RepoFile{
			Name: entry.Name,
			Path: path.Join(requestPath, entry.Name), // e.g., "src/main.go"
			Type: nodeType,
		})
	}

	return files, nil
}

func (g *LocalGitAdapter) GetBlob(repoName string, requestPath string, branch string) (string, error) {
	fullPath := filepath.Join(g.storageRoot, repoName+".git")

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

func (g *LocalGitAdapter) GetCommits(repoName string, branch string) ([]domain.Commit, error) {
	fullPath := filepath.Join(g.storageRoot, repoName+".git")

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

func (g *LocalGitAdapter) GetBranches(repoName string) ([]domain.Branch, error) {
	fullPath := filepath.Join(g.storageRoot, repoName+".git")
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

func (g *LocalGitAdapter) MergeBranches(
	repoName string, sourceBranch string, targetBranch string,
	mergerName string, commitMessage string,
) error {
	bareRepoPath := filepath.Join(g.storageRoot, repoName)

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
		// If this fails, it is almost certainly a merge conflict.
		// The temp dir will be deleted, leaving the bare repo untouched.
		return errors.New("merge conflict detected: cannot merge automatically")
	}

	// 6. Push the merged target branch back to the bare repository
	if err := runGitCmd("push", "origin", targetBranch); err != nil {
		return fmt.Errorf("failed to push merged branch: %w", err)
	}

	return nil
}
