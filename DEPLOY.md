# Synergit Deployment Guide

This guide outlines the steps to deploy Synergit using Docker Compose. This architecture isolates the database, backend, and frontend/Nginx reverse proxy into separate containers, ensuring consistency and avoiding port conflicts on shared VPS environments.

### 1. Install Prerequisites

You no longer need to install Go, Node.js, or PostgreSQL directly on your host machine. You only need Docker.

SSH into your Ubuntu VPS and run the following commands:

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install docker.io docker-compose-v2 -y

# Ensure Docker starts on boot
sudo systemctl enable docker
sudo systemctl start docker

```

### 2. Configure Environment Variables

Navigate to the project root directory and create a central `.env` file. This file controls the database credentials, application secrets, and exposed ports.

Create the file:

```bash
nano .env

```

Paste the following configuration (replace the IP with your actual VPS IP or domain):

```env
# Database configuration
DB_USER=synergit_user
DB_PASSWORD=your_secure_password
DB_NAME=synergit

# Backend configuration
JWT_SECRET=a_long_and_complex_random_secret_string

# Port configuration (Customized to avoid default port conflicts on Shared VPS)
APP_PORT=7080
HTTPS_PORT=7443

# Frontend URL (Used by Backend for CORS - MUST match the HTTPS port)
FRONTEND_URL=https://your_vps_ip_address:7443

# Public Git Smart HTTP clone/push URL shown in the web UI.
# Usually this is the same external origin as FRONTEND_URL.
GIT_BASE_URL=https://your_vps_ip_address:7443

```

### 3. Generate SSL Certificates for Nginx

Nginx is strictly configured to serve traffic over HTTPS. Since we are deploying on a direct IP address, we must generate a self-signed certificate before starting the containers to prevent Nginx from crashing.

Run these commands in the project root:

```bash
# Create the SSL directory mapped in docker-compose
mkdir -p ssl

# Generate a self-signed certificate valid for 365 days
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/CN=your_vps_ip_address"

```

### 4. Frontend Build Configuration

To ensure the compiled React/Vite frontend correctly communicates with the Nginx reverse proxy, Vite needs to know the relative API path at build time. We handle this cleanly using a dedicated environment file specifically for the frontend.

**Step 1: Create the Frontend `.env` File**
Create a `.env` file inside your `frontend/` directory (separate from the main project `.env`).

```bash
nano frontend/.env

```

Add the following relative API path:

```env
VITE_API_BASE_URL=/api/v1

```

*(Using a relative path ensures the frontend dynamically calls the API via Nginx regardless of the domain or IP, naturally preventing CORS issues).*

**Step 2: Verify `.dockerignore` (Crucial)**
Because the build process relies on `frontend/.env`, you must ensure your `.dockerignore` file is **not** ignoring it. If Docker excludes this file during the context build, Vite will compile with an `undefined` URL, breaking all API requests.

**Step 3: Dockerfile Setup**
With the environment file properly placed, your `Dockerfile.web` will automatically pick up the variables during the standard build command. Verify your `Dockerfile.web` uses the following structure:

```dockerfile
# Build Frontend Stage
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# 1. Copy package files
COPY frontend/package*.json ./

# 2. Copy the scripts folder required by the postinstall hook
COPY frontend/scripts ./scripts

# 3. Install dependencies
RUN npm install

# 4. Copy the rest of the frontend source code (including frontend/.env)
COPY frontend/ .

# 5. Build the static files
RUN npm run build

# Serve Stage with Nginx
FROM nginx:alpine
# Copy built static files
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
# Copy Nginx routing configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

```

### 5. Build and Deploy Containers

With the environment configured and SSL keys generated, you can launch the entire stack.

1. Start Postgres and apply database migrations:

```bash
docker compose up -d db
docker compose run --rm migrate

```

2. Build and start the application containers in detached mode:

```bash
docker compose up -d --build

```

3. Verify that all 3 containers (`synergit-db-1`, `synergit-backend-1`, `synergit-web-1`) are running:

```bash
docker ps

```

### 6. Database Migration Notes

Database changes are managed through versioned `golang-migrate` SQL files in `migrations/`.
`schema.sql` is kept as a full schema snapshot/reference, but deployment uses migrations.

* If you need to verify the tables were created successfully, run:
```bash
docker compose exec db psql -U synergit_user -d synergit -c "\dt"

```

* To apply migrations manually, run:
```bash
docker compose run --rm migrate

```

* **Troubleshooting:** If a local development database is intentionally disposable, you can wipe the database volume and re-run migrations from scratch:
```bash
docker compose down -v
docker compose up -d db
docker compose run --rm migrate

```

### 7. Accessing the Application

Once deployed, the application is accessible via:

* **Secure (HTTPS):** `https://your_vps_ip_address:7443`
* **HTTP Redirect:** `http://your_vps_ip_address:7080` (Automatically redirects to the secure port)

*Note: If using a self-signed certificate via IP address, your browser will display a "Connection is not private" warning. This is expected. Click "Advanced" -> "Proceed" to access the application.*
