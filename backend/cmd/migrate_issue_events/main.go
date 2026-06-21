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
	_ = godotenv.Load("../../.env")
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:user@localhost:5432/synergit?sslmode=disable"
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec(`ALTER TABLE issue_events ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;`)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Migration successful!")
}
