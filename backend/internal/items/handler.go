package items

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/pang16334/captshelf/internal/db"
)

type Handler struct {
	queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{queries: queries}
}

func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	committeeID := r.URL.Query().Get("committee_id")

	if committeeID != "" {
		id, err := strconv.Atoi(committeeID)
		if err != nil {
			http.Error(w, "invalid committee_id", http.StatusBadRequest)
			return
		}
		items, err := h.queries.GetItemsByCommittee(r.Context(), int32(id))
		if err != nil {
			http.Error(w, "failed to fetch items", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(items)
		return
	}

	items, err := h.queries.GetAllItems(r.Context())
	if err != nil {
		http.Error(w, "failed to fetch items", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	item, err := h.queries.GetItemByID(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "item not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var body db.CreateItemParams
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	item, err := h.queries.CreateItem(r.Context(), body)
	if err != nil {
		http.Error(w, "failed to create item", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var body db.UpdateItemParams
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	body.ID = int32(id)

	item, err := h.queries.UpdateItem(r.Context(), body)
	if err != nil {
		http.Error(w, "failed to update item", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := h.queries.DeleteItem(r.Context(), int32(id)); err != nil {
		http.Error(w, "failed to delete item", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Import(w http.ResponseWriter, r *http.Request) {
	// placeholder — we'll implement Excel import later
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
