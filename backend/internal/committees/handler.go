package committees

import (
	"encoding/json"
	"net/http"

	"github.com/pang16334/captshelf/internal/db"
)

type Handler struct {
	queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{queries: queries}
}

func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	committees, err := h.queries.GetAllCommittees(r.Context())
	if err != nil {
		http.Error(w, "failed to fetch committees", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(committees)
}
