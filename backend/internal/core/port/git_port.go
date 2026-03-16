package port

type GitManager interface {
	InitBareRepo(repoName string) (string, error)
}
