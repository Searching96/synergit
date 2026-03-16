package repository

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

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
