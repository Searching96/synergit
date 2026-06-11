package git_analysis

import (
	"errors"
	"math"
	"path/filepath"
	"sort"
	"strings"
	"synergit/internal/core/domain"

	git "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
)

var allowedProgrammingLanguages = map[string]struct{}{
	"Assembly":   {},
	"Batchfile":  {},
	"C":          {},
	"C#":         {},
	"C++":        {},
	"CSS":        {},
	"Dockerfile": {},
	"GDScript":   {},
	"Go":         {},
	"HTML":       {},
	"Haskell":    {},
	"Java":       {},
	"JavaScript": {},
	"Python":     {},
	"Rust":       {},
	"Shell":      {},
	"TypeScript": {},
}

var extensionLanguageMap = map[string]string{
	".asm":   "Assembly",
	".bat":   "Batchfile",
	".bash":  "Shell",
	".c":     "C",
	".cc":    "C++",
	".cmd":   "Batchfile",
	".cpp":   "C++",
	".cs":    "C#",
	".csx":   "C#",
	".css":   "CSS",
	".cts":   "TypeScript",
	".cxx":   "C++",
	".fish":  "Shell",
	".gd":    "GDScript",
	".go":    "Go",
	".h":     "C",
	".hh":    "C++",
	".hpp":   "C++",
	".hs":    "Haskell",
	".htm":   "HTML",
	".html":  "HTML",
	".hxx":   "C++",
	".inl":   "C++",
	".ipp":   "C++",
	".java":  "Java",
	".js":    "JavaScript",
	".jsx":   "JavaScript",
	".ksh":   "Shell",
	".less":  "CSS",
	".lhs":   "Haskell",
	".mjs":   "JavaScript",
	".mts":   "TypeScript",
	".py":    "Python",
	".rs":    "Rust",
	".s":     "Assembly",
	".sass":  "CSS",
	".scss":  "CSS",
	".sh":    "Shell",
	".tpp":   "C++",
	".ts":    "TypeScript",
	".tsx":   "TypeScript",
	".xhtml": "HTML",
	".zsh":   "Shell",
}

var filenameLanguageMap = map[string]string{
	"dockerfile": "Dockerfile",
}

var ignoredLanguageDirs = map[string]struct{}{
	".git":         {},
	".next":        {},
	"bin":          {},
	"build":        {},
	"coverage":     {},
	"dist":         {},
	"node_modules": {},
	"obj":          {},
	"target":       {},
	"vendor":       {},
}

func AnalyzeLanguageBreakdown(repoPath string,
	preferredBranch string) (string, []domain.LanguageStat, error) {

	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return "", nil, err
	}

	ref, err := resolvePreferredBranchReference(repo, preferredBranch)
	if err != nil {
		if errors.Is(err, plumbing.ErrReferenceNotFound) {
			return "", []domain.LanguageStat{}, nil
		}
		return "", nil, err
	}

	commit, err := repo.CommitObject(ref.Hash())
	if err != nil {
		return "", nil, err
	}

	tree, err := commit.Tree()
	if err != nil {
		return "", nil, err
	}

	counts := map[string]int64{}
	var totalBytes int64

	err = tree.Files().ForEach(func(file *object.File) error {
		language := classifyProgrammingLanguage(file.Name)
		if language == "" {
			return nil
		}

		size := countEffectiveCodeBytes(language, file)
		if size <= 0 {
			return nil
		}

		counts[language] += size
		totalBytes += size

		return nil
	})
	if err != nil {
		return "", nil, err
	}

	if totalBytes == 0 {
		return "", []domain.LanguageStat{}, nil
	}

	breakdown := make([]domain.LanguageStat, 0, len(counts))
	for language, bytes := range counts {
		percentage := math.Round((float64(bytes)*10000)/float64(totalBytes)) / 100
		breakdown = append(breakdown, domain.LanguageStat{
			Language:   language,
			Bytes:      bytes,
			Percentage: percentage,
		})
	}

	sort.Slice(breakdown, func(i int, j int) bool {
		if breakdown[i].Bytes == breakdown[j].Bytes {
			return breakdown[i].Language < breakdown[j].Language
		}
		return breakdown[i].Bytes > breakdown[j].Bytes
	})

	return breakdown[0].Language, breakdown, nil
}

func resolvePreferredBranchReference(repo *git.Repository,
	preferredBranch string) (*plumbing.Reference, error) {

	candidates := []string{strings.TrimSpace(preferredBranch), "master", "main", ""}
	seen := map[string]struct{}{}

	for _, candidate := range candidates {
		if _, exists := seen[candidate]; exists {
			continue
		}
		seen[candidate] = struct{}{}

		ref, err := resolveBranchReference(repo, candidate)
		if err == nil {
			return ref, nil
		}
		if errors.Is(err, plumbing.ErrReferenceNotFound) {
			continue
		}

		return nil, err
	}

	return nil, plumbing.ErrReferenceNotFound
}

func resolveBranchReference(repo *git.Repository, branch string) (*plumbing.Reference, error) {
	if branch == "" {
		return repo.Head()
	}

	trimmed := strings.TrimSpace(branch)
	branchRef, err := repo.Reference(plumbing.ReferenceName("refs/heads/"+trimmed), true)
	if err == nil {
		return branchRef, nil
	}

	if !errors.Is(err, plumbing.ErrReferenceNotFound) {
		return nil, err
	}

	resolvedHash, resolveErr := repo.ResolveRevision(plumbing.Revision(trimmed))
	if resolveErr == nil {
		return plumbing.NewHashReference(plumbing.ReferenceName("refs/revisions/"+trimmed), *resolvedHash), nil
	}

	return nil, err
}

func classifyProgrammingLanguage(filePath string) string {
	normalizedPath := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(filePath), "\\", "/"))
	if normalizedPath == "" {
		return ""
	}

	if shouldIgnoreLanguagePath(normalizedPath) {
		return ""
	}

	baseName := filepath.Base(normalizedPath)
	if language, ok := filenameLanguageMap[baseName]; ok {
		if _, allowed := allowedProgrammingLanguages[language]; allowed {
			return language
		}
		return ""
	}

	language, ok := extensionLanguageMap[filepath.Ext(baseName)]
	if !ok {
		return ""
	}

	if _, allowed := allowedProgrammingLanguages[language]; !allowed {
		return ""
	}

	return language
}

func shouldIgnoreLanguagePath(normalizedPath string) bool {
	for _, segment := range strings.Split(normalizedPath, "/") {
		if _, ignored := ignoredLanguageDirs[segment]; ignored {
			return true
		}
	}

	if strings.HasSuffix(normalizedPath, ".min.js") || strings.HasSuffix(normalizedPath, ".min.css") {
		return true
	}

	return false
}

func countEffectiveCodeBytes(language string, file *object.File) int64 {
	if file == nil {
		return 0
	}

	content, err := file.Contents()
	if err != nil {
		if file.Blob.Size < 0 {
			return 0
		}
		return file.Blob.Size
	}

	cleaned := stripCommentsByLanguage(language, content)
	if cleaned == "" {
		return 0
	}

	var total int64
	for _, line := range strings.Split(cleaned, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		total += int64(len(trimmed))
	}

	return total
}

func stripCommentsByLanguage(language string, content string) string {
	switch language {
	case "Go", "Java", "JavaScript", "TypeScript", "C", "C++", "C#", "Rust", "GDScript", "CSS":
		return stripLineAndBlockComments(content, []string{"//"}, "/*", "*/")
	case "Python", "Shell", "Dockerfile":
		return stripPrefixedLineComments(content, []string{"#"})
	case "Batchfile":
		return stripBatchfileComments(content)
	case "Assembly":
		return stripLineAndBlockComments(content, []string{";"}, "", "")
	case "Haskell":
		return stripLineAndBlockComments(content, []string{"--"}, "{-", "-}")
	case "HTML":
		return stripLineAndBlockComments(content, nil, "<!--", "-->")
	default:
		return content
	}
}

func stripPrefixedLineComments(content string, prefixes []string) string {
	if len(prefixes) == 0 {
		return content
	}

	lines := strings.Split(content, "\n")
	kept := make([]string, 0, len(lines))

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		isComment := false
		for _, prefix := range prefixes {
			if strings.HasPrefix(trimmed, prefix) {
				isComment = true
				break
			}
		}

		if isComment {
			kept = append(kept, "")
			continue
		}

		kept = append(kept, line)
	}

	return strings.Join(kept, "\n")
}

func stripBatchfileComments(content string) string {
	lines := strings.Split(content, "\n")
	kept := make([]string, 0, len(lines))

	for _, line := range lines {
		trimmed := strings.ToLower(strings.TrimSpace(line))
		if strings.HasPrefix(trimmed, "::") ||
			trimmed == "rem" ||
			strings.HasPrefix(trimmed, "rem ") ||
			strings.HasPrefix(trimmed, "rem\t") {

			kept = append(kept, "")
			continue
		}

		kept = append(kept, line)
	}

	return strings.Join(kept, "\n")
}

func stripLineAndBlockComments(content string, lineMarkers []string,
	blockStart string, blockEnd string) string {

	var builder strings.Builder
	builder.Grow(len(content))

	inBlock := false

	for i := 0; i < len(content); {
		if inBlock {
			if blockEnd != "" && strings.HasPrefix(content[i:], blockEnd) {
				inBlock = false
				i += len(blockEnd)
				continue
			}

			if content[i] == '\n' {
				builder.WriteByte('\n')
			}

			i++
			continue
		}

		if blockStart != "" && strings.HasPrefix(content[i:], blockStart) {
			inBlock = true
			i += len(blockStart)
			continue
		}

		lineCommentFound := false
		for _, marker := range lineMarkers {
			if marker == "" {
				continue
			}

			if strings.HasPrefix(content[i:], marker) {
				lineCommentFound = true
				i += len(marker)
				for i < len(content) && content[i] != '\n' {
					i++
				}
				if i < len(content) && content[i] == '\n' {
					builder.WriteByte('\n')
					i++
				}
				break
			}
		}

		if lineCommentFound {
			continue
		}

		builder.WriteByte(content[i])
		i++
	}

	return builder.String()
}
