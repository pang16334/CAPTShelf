package items

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/pang16334/captshelf/internal/db"
	"github.com/pang16334/captshelf/internal/helpers"
	"github.com/xuri/excelize/v2"
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
		if items == nil {
			items = []db.GetItemsByCommitteeRow{}
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
	// always return empty array not null
	if items == nil {
		items = []db.GetAllItemsRow{}
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

	var body struct {
		Name          string  `json:"name"`
		Category      string  `json:"category"`
		Variant       *string `json:"variant"`
		CommitteeID   int32   `json:"committee_id"`
		TotalQuantity int32   `json:"total_quantity"`
		Description   *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	item, err := h.queries.UpdateItem(r.Context(), db.UpdateItemParams{
		ID:       int32(id),
		Name:     body.Name,
		Category: body.Category,
		Variant: helpers.NullText(func() string {
			if body.Variant != nil {
				return *body.Variant
			}
			return ""
		}()),
		CommitteeID:   body.CommitteeID,
		TotalQuantity: body.TotalQuantity,
		Description: helpers.NullText(func() string {
			if body.Description != nil {
				return *body.Description
			}
			return ""
		}()),
	})
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
		log.Printf("DeleteItem error: %v", err)
		http.Error(w, "failed to delete item", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetBorrowHistory(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	history, err := h.queries.GetItemBorrowHistory(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "failed to fetch borrow history", http.StatusInternalServerError)
		return
	}

	// return empty array instead of null
	if history == nil {
		history = []db.GetItemBorrowHistoryRow{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// For importing Excel sheets
func (h *Handler) Import(w http.ResponseWriter, r *http.Request) {
	// parse multipart form — max 10MB
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "file too large", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// open excel file
	f, err := excelize.OpenReader(file)
	if err != nil {
		http.Error(w, "invalid excel file", http.StatusBadRequest)
		return
	}
	defer f.Close()

	// read rows from Inventory sheet
	rows, err := f.GetRows("Inventory")
	if err != nil {
		http.Error(w, "sheet 'Inventory' not found", http.StatusBadRequest)
		return
	}

	// find header row (row 4 in excel = index 3)
	// headers: name, category, variant, committee, total_quantity, description
	headerRow := -1
	colIndex := map[string]int{}

	for i, row := range rows {
		for j, cell := range row {
			clean := strings.ToLower(strings.TrimSpace(strings.ReplaceAll(cell, "*", "")))
			if clean == "name" {
				headerRow = i
			}
			colIndex[clean] = j
		}
		if headerRow == i {
			break
		}
	}

	if headerRow == -1 {
		http.Error(w, "could not find header row with 'name' column", http.StatusBadRequest)
		return
	}

	// fetch all committees for name lookup
	committees, err := h.queries.GetAllCommittees(r.Context())
	if err != nil {
		http.Error(w, "failed to fetch committees", http.StatusInternalServerError)
		return
	}

	// build committee name → id map (case insensitive)
	committeeMap := map[string]int32{}
	for _, c := range committees {
		committeeMap[strings.ToLower(strings.TrimSpace(c.Name))] = c.ID
	}

	// process data rows
	imported := 0
	skipped := 0
	errors := []string{}

	for i, row := range rows[headerRow+1:] {
		// skip empty rows
		if len(row) == 0 {
			continue
		}

		getCol := func(key string) string {
			idx, ok := colIndex[key]
			if !ok || idx >= len(row) {
				return ""
			}
			return strings.TrimSpace(row[idx])
		}

		name := getCol("name")
		category := getCol("category")
		variant := getCol("variant")
		committeeName := strings.ToLower(strings.TrimSpace(getCol("committee")))
		totalQtyStr := getCol("total_quantity")
		description := getCol("description")

		// skip empty rows
		if name == "" && category == "" {
			continue
		}

		// validate required fields
		if name == "" {
			errors = append(errors, fmt.Sprintf("row %d: missing name", headerRow+i+2))
			skipped++
			continue
		}
		if category == "" {
			errors = append(errors, fmt.Sprintf("row %d: missing category", headerRow+i+2))
			skipped++
			continue
		}
		if committeeName == "" {
			errors = append(errors, fmt.Sprintf("row %d: missing committee", headerRow+i+2))
			skipped++
			continue
		}

		// lookup committee id
		committeeID, ok := committeeMap[committeeName]
		if !ok {
			errors = append(errors, fmt.Sprintf("row %d: unknown committee '%s'", headerRow+i+2, getCol("committee")))
			skipped++
			continue
		}

		// parse quantity
		totalQty, err := strconv.Atoi(totalQtyStr)
		if err != nil || totalQty <= 0 {
			errors = append(errors, fmt.Sprintf("row %d: invalid quantity '%s'", headerRow+i+2, totalQtyStr))
			skipped++
			continue
		}

		// upsert item
		_, err = h.queries.UpsertItem(r.Context(), db.UpsertItemParams{
			Name:          name,
			Category:      category,
			Variant:       helpers.NullText(variant),
			CommitteeID:   committeeID,
			TotalQuantity: int32(totalQty),
			Description:   helpers.NullText(description),
		})
		if err != nil {
			errors = append(errors, fmt.Sprintf("row %d: failed to save '%s'", headerRow+i+2, name))
			skipped++
			continue
		}

		imported++
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"imported": imported,
		"skipped":  skipped,
		"errors":   errors,
	})
}
