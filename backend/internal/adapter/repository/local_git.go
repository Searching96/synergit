package repository

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
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
