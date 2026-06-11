package input

type AuthUseCase interface {
	Register(username string, email string, password string) error
	Login(username string, password string) (string, error)
}
