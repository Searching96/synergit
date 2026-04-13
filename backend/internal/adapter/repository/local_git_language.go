package repository

import (
	"synergit/internal/adapter/git_analysis"
	"synergit/internal/core/domain"
)

func (g *LocalGitAdapter) GetLanguageBreakdown(repoPath string,
	preferredBranch string) (string, []domain.LanguageStat, error) {

	fullPath := g.resolveRepoPath(repoPath)
	return git_analysis.AnalyzeLanguageBreakdown(fullPath, preferredBranch)
}
