package borrowrequests

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/pang16334/captshelf/internal/db"
	"github.com/pang16334/captshelf/internal/helpers"
	"github.com/pang16334/captshelf/internal/middleware"
)

type Handler struct {
	queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{queries: queries}
}

func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r)
	committeeID := r.URL.Query().Get("committee_id")
	my := r.URL.Query().Get("my")

	// filter to own borrows
	if my == "true" {
		requests, err := h.queries.GetBorrowRequestsByTelegramID(r.Context(), user.TelegramID)
		if err != nil {
			http.Error(w, "failed to fetch borrow requests", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(requests)
		return
	}

	// filter by committee
	if committeeID != "" {
		id, err := strconv.Atoi(committeeID)
		if err != nil {
			http.Error(w, "invalid committee_id", http.StatusBadRequest)
			return
		}
		requests, err := h.queries.GetBorrowRequestsByCommittee(r.Context(), int32(id))
		if err != nil {
			http.Error(w, "failed to fetch borrow requests", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(requests)
		return
	}

	// everyone sees everything
	requests, err := h.queries.GetAllBorrowRequests(r.Context())
	if err != nil {
		http.Error(w, "failed to fetch borrow requests", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	request, err := h.queries.GetBorrowRequestByID(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "borrow request not found", http.StatusNotFound)
		return
	}

	items, err := h.queries.GetBorrowRequestItems(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "failed to fetch borrow request items", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"request": request,
		"items":   items,
	})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r)

	var body struct {
		BorrowerName     string `json:"borrower_name"`
		CommitteeID      int32  `json:"committee_id"`
		BorrowPhotoUrl   string `json:"borrow_photo_url"`
		ExpectedReturnAt string `json:"expected_return_at"` // receive as string "2025-06-30"
		Remarks          string `json:"remarks"`
		Items            []struct {
			ItemID   int32 `json:"item_id"`
			Quantity int32 `json:"quantity"`
		} `json:"items"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	// parse date using helper
	expectedReturnAt, err := helpers.ParseDate(body.ExpectedReturnAt)
	if err != nil {
		http.Error(w, "invalid date format, use YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	// create borrow request
	request, err := h.queries.CreateBorrowRequest(r.Context(), db.CreateBorrowRequestParams{
		BorrowerName:       body.BorrowerName,
		BorrowerTelegramID: user.TelegramID,
		CommitteeID:        body.CommitteeID,
		BorrowPhotoUrl:     body.BorrowPhotoUrl,
		ExpectedReturnAt:   expectedReturnAt,
		Remarks:            helpers.NullText(body.Remarks),
	})
	if err != nil {
		http.Error(w, "failed to create borrow request", http.StatusInternalServerError)
		return
	}

	// create borrow request items
	for _, item := range body.Items {
		_, err := h.queries.CreateBorrowRequestItem(r.Context(), db.CreateBorrowRequestItemParams{
			BorrowRequestID: request.ID,
			ItemID:          item.ItemID,
			Quantity:        item.Quantity,
		})
		if err != nil {
			http.Error(w, "failed to create borrow request item", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(request)
}

func (h *Handler) Return(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var body struct {
		ReturnPhotoUrl string `json:"return_photo_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	request, err := h.queries.ReturnBorrowRequest(r.Context(), db.ReturnBorrowRequestParams{
		ID:             int32(id),
		ReturnPhotoUrl: body.ReturnPhotoUrl,
	})
	if err != nil {
		http.Error(w, "failed to return borrow request", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(request)
}

func (h *Handler) Cancel(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	user := middleware.GetUser(r)

	// fetch the request first to check permissions
	request, err := h.queries.GetBorrowRequestByID(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "borrow request not found", http.StatusNotFound)
		return
	}

	// permission check
	switch user.Role {
	case "user":
		if request.BorrowerTelegramID != user.TelegramID {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
	case "committee_admin":
		if user.CommitteeID == nil || request.CommitteeID != int32(*user.CommitteeID) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
	}
	// super_admin can cancel anything, no check needed

	cancelled, err := h.queries.CancelBorrowRequest(r.Context(), int32(id))
	if err != nil {
		http.Error(w, "failed to cancel borrow request", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cancelled)
}
