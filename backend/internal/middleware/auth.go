package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type User struct {
	ID          int    `json:"id"`
	TelegramID  int64  `json:"telegram_id"`
	Name        string `json:"name"`
	Username    string `json:"username"`
	Role        string `json:"role"`
	CommitteeID *int   `json:"committee_id"`
}

type contextKey string

const UserContextKey contextKey = "user"

func Auth(db *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var telegramID int64
			var name, username string

			devMode := os.Getenv("DEV_MODE") == "true"

			if devMode {
				// inject fake user in dev mode
				telegramID, _ = strconv.ParseInt(os.Getenv("DEV_TELEGRAM_ID"), 10, 64)
				name = "Dev User"
				username = "devuser"
			} else {
				initData := r.Header.Get("X-Telegram-Init-Data")
				if initData == "" {
					http.Error(w, "missing auth", http.StatusUnauthorized)
					return
				}

				if !validateInitData(initData) {
					http.Error(w, "invalid auth", http.StatusUnauthorized)
					return
				}

				var err error
				telegramID, name, username, err = parseInitData(initData)
				if err != nil {
					http.Error(w, "failed to parse auth", http.StatusUnauthorized)
					return
				}
			}

			// look up or create user
			user, err := findOrCreateUser(r.Context(), db, telegramID, name, username)
			if err != nil {
				http.Error(w, "user error", http.StatusInternalServerError)
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUser(r *http.Request) *User {
	user, _ := r.Context().Value(UserContextKey).(*User)
	return user
}

func validateInitData(initData string) bool {
	botToken := os.Getenv("BOT_TOKEN")

	vals, err := url.ParseQuery(initData)
	if err != nil {
		return false
	}

	hash := vals.Get("hash")
	vals.Del("hash")

	// build check string
	keys := make([]string, 0, len(vals))
	for k := range vals {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, k+"="+vals.Get(k))
	}
	checkString := strings.Join(parts, "\n")

	// HMAC-SHA256
	secretKey := hmac.New(sha256.New, []byte("WebAppData"))
	secretKey.Write([]byte(botToken))

	mac := hmac.New(sha256.New, secretKey.Sum(nil))
	mac.Write([]byte(checkString))
	expectedHash := hex.EncodeToString(mac.Sum(nil))

	return expectedHash == hash
}

func parseInitData(initData string) (int64, string, string, error) {
	vals, err := url.ParseQuery(initData)
	if err != nil {
		return 0, "", "", err
	}

	var userData struct {
		ID        int64  `json:"id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Username  string `json:"username"`
	}

	if err := json.Unmarshal([]byte(vals.Get("user")), &userData); err != nil {
		return 0, "", "", err
	}

	name := strings.TrimSpace(userData.FirstName + " " + userData.LastName)
	return userData.ID, name, userData.Username, nil
}

func findOrCreateUser(ctx context.Context, db *pgxpool.Pool, telegramID int64, name, username string) (*User, error) {
	user := &User{}

	err := db.QueryRow(ctx, `
		SELECT id, telegram_id, name, username, role, committee_id
		FROM users
		WHERE telegram_id = $1
	`, telegramID).Scan(&user.ID, &user.TelegramID, &user.Name, &user.Username, &user.Role, &user.CommitteeID)

	if err != nil {
		// user doesn't exist, create them
		err = db.QueryRow(ctx, `
			INSERT INTO users (telegram_id, name, username, role)
			VALUES ($1, $2, $3, 'user')
			RETURNING id, telegram_id, name, username, role, committee_id
		`, telegramID, name, username).Scan(&user.ID, &user.TelegramID, &user.Name, &user.Username, &user.Role, &user.CommitteeID)

		if err != nil {
			return nil, err
		}
	}

	return user, nil
}

func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUser(r)
		if user == nil || (user.Role != "super_admin" && user.Role != "committee_admin") {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
