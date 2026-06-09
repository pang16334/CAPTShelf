package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	"github.com/pang16334/captshelf/internal/borrowrequests"
	"github.com/pang16334/captshelf/internal/committees"
	"github.com/pang16334/captshelf/internal/database"
	"github.com/pang16334/captshelf/internal/db"
	"github.com/pang16334/captshelf/internal/items"
	"github.com/pang16334/captshelf/internal/middleware"
	"github.com/pang16334/captshelf/internal/users"
)

func main() {
	// load .env
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("no .env file found, using system env")
	}

	// connect to database
	pool, err := database.Connect()
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	// init sqlc queries
	queries := db.New(pool)

	// init handlers
	committeeHandler := committees.NewHandler(queries)
	itemHandler := items.NewHandler(queries)
	borrowHandler := borrowrequests.NewHandler(queries)
	userHandler := users.NewHandler(queries)

	// init router
	r := chi.NewRouter()

	// global middleware
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RealIP)

	// CORS for local frontend dev
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Telegram-Init-Data")
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	// auth middleware
	authMiddleware := middleware.Auth(pool)

	// routes
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)

		// me
		r.Get("/me", userHandler.GetMe)

		// committees
		r.Get("/committees", committeeHandler.GetAll)

		// items
		r.Get("/items", itemHandler.GetAll)
		r.Get("/items/{id}", itemHandler.GetByID)
		r.Get("/items/{id}/borrows", itemHandler.GetBorrowHistory)

		// borrow requests
		r.Get("/borrow-requests", borrowHandler.GetAll)
		r.Get("/borrow-requests/{id}", borrowHandler.GetByID)
		r.Post("/borrow-requests", borrowHandler.Create)
		r.Post("/borrow-requests/{id}/return", borrowHandler.Return)
		r.Post("/borrow-requests/{id}/cancel", borrowHandler.Cancel)

		// admin routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAdmin)
			r.Post("/items", itemHandler.Create)
			r.Put("/items/{id}", itemHandler.Update)
			r.Delete("/items/{id}", itemHandler.Delete)
			r.Post("/admin/items/import", itemHandler.Import)
			r.Get("/admin/users", userHandler.GetAll)
			r.Put("/admin/users/{id}/role", userHandler.UpdateRole)
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("server running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
