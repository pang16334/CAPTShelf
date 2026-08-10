# Stage 1 — build
FROM golang:1.25-alpine AS builder

WORKDIR /app

# copy dependency files first (Docker caches this layer)
COPY go.mod go.sum ./
RUN go mod download

# copy source code
COPY . .

# build binary
RUN CGO_ENABLED=0 GOOS=linux go build -o main cmd/api/main.go

# Stage 2 — run
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# copy only the binary from stage 1
COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
