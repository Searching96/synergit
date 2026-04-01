package domain

import (
	"time"
)

type RepoFileType string

const (
	RepoFileTypeFile RepoFileType = "FILE"
	RepoFileTypeDir  RepoFileType = "DIR"
)

type RepoFile struct {
	Name string       `json:"name"`
	Path string       `json:"path"`
	Type RepoFileType `json:"type"`
}

type Commit struct {
	Hash    string    `json:"hash"`
	Author  string    `json:"author"`
	Message string    `json:"message"`
	Date    time.Time `json:"date"`
}

type Branch struct {
	Name       string `json:"name"`
	CommitHash string `json:"commit_hash"`
	IsDefault  bool   `json:"is_default"`
}
