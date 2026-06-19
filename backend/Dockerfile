# Build Stage
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o server cmd/server/main.go

# Run Stage
FROM alpine:latest
# Install git in the container as the backend relies on local git operations
RUN apk add --no-cache git
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]