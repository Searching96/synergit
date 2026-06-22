package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found")
	}

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open DB connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}

	query := `
	CREATE TABLE IF NOT EXISTS issue_linked_branches (
		issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
		branch_name VARCHAR(255) NOT NULL,
		linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		PRIMARY KEY (issue_id, branch_name)
	);
	`
	_, err = db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to execute query: %v", err)
	}
	fmt.Println("Migration successful.")
}
