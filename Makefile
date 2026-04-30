.PHONY: up backend frontend stop-backend stop-frontend

up: backend frontend

backend: stop-backend
	@echo Starting Synergit Backend...
	@cmd /c start "Synergit Backend" cmd /k "cd backend && go run cmd/server/main.go"

frontend: stop-frontend
	@echo Starting Synergit Frontend...
	@cmd /c start "Synergit Frontend" cmd /k "cd frontend && npm run dev"

stop-backend:
	-@cmd /c taskkill /FI "WINDOWTITLE eq Synergit Backend*" /T /F >nul 2>&1

stop-frontend:
	-@cmd /c taskkill /FI "WINDOWTITLE eq Synergit Frontend*" /T /F >nul 2>&1