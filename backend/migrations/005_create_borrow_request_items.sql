CREATE TABLE borrow_request_items (
    id                 SERIAL PRIMARY KEY,
    borrow_request_id  INT NOT NULL REFERENCES borrow_requests(id),
    item_id            INT NOT NULL REFERENCES items(id),
    quantity           INT NOT NULL,
    returned_quantity  INT NOT NULL DEFAULT 0
);