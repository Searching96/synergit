# Variables
BACKEND_DIR := backend
FRONTEND_DIR := frontend
DETACHED := $(if $(filter 1,$(d)),1,0)

.PHONY: help up down backend-up frontend-up backend-down frontend-down install build clean

# Default command when running just `make`
help:
	@echo Synergit Makefile Commands:
	@echo   make up [d=1]            - Start both backend and frontend. Use d=1 for detached mode
	@echo   make down                - Stop both backend and frontend servers
	@echo   make backend-up [d=1]    - Start backend server. Use d=1 for detached mode
	@echo   make frontend-up [d=1]   - Start frontend server. Use d=1 for detached mode
	@echo   make backend-down        - Stop backend server
	@echo   make frontend-down       - Stop frontend server
	@echo   make install             - Install dependencies for both backend and frontend
	@echo   make build               - Build both backend and frontend for production
	@echo   make clean               - Remove build artifacts

up: 
ifeq ($(DETACHED),1)
	@echo Servers are running in detached mode. Use 'make down' to stop them.
	@$(MAKE) backend-up frontend-up d=1
else
	@echo Starting both servers in the integrated terminal... (Press Ctrl+C to stop)
	@$(MAKE) -j 2 backend-up frontend-up
endif

# RUN DEVELOPMENT SERVERS

backend-up: 
ifeq ($(DETACHED),1)
	@echo Starting Synergit Backend (Detached)...
	@cmd /c start "Synergit Backend" /MIN cmd /k "cd $(BACKEND_DIR) && go run cmd/server/main.go"
else
	@echo Starting Synergit Backend...
	cd $(BACKEND_DIR) && go run cmd/server/main.go
endif

frontend-up: 
ifeq ($(DETACHED),1)
	@echo Starting Synergit Frontend (Detached)...
	@cmd /c start "Synergit Frontend" /MIN cmd /k "cd $(FRONTEND_DIR) && npm run dev"
else
	@echo Starting Synergit Frontend...
	cd $(FRONTEND_DIR) && npm run dev
endif

# STOP SERVERS

down: backend-down frontend-down
	@echo All servers stopped.

backend-down:
	-@cmd /c taskkill /FI "WINDOWTITLE eq Synergit Backend*" /T /F >nul 2>&1
	-@taskkill /F /IM "main.exe" >nul 2>&1
	-@taskkill /F /IM "server.exe" >nul 2>&1

frontend-down:
	-@cmd /c taskkill /FI "WINDOWTITLE eq Synergit Frontend*" /T /F >nul 2>&1
	-@taskkill /F /IM "node.exe" >nul 2>&1

# PROJECT LIFECYCLE

install:
	@echo Installing backend dependencies...
	@cd $(BACKEND_DIR) && go mod tidy
	@echo Installing frontend dependencies...
	@cd $(FRONTEND_DIR) && npm install

build:
	@echo Building backend...
	@cd $(BACKEND_DIR) && go build -o bin/server.exe cmd/server/main.go
	@echo Building frontend...
	@cd $(FRONTEND_DIR) && npm run build
	@echo Build complete!

clean: down
	@echo Cleaning backend artifacts...
	-@rm -rf $(BACKEND_DIR)/bin
	@echo Cleaning frontend artifacts...
	-@rm -rf $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/node_modules