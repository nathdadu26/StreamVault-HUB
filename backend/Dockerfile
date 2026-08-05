# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod file
COPY go.mod ./

# Copy source code and tidy dependencies to generate go.sum
COPY . .
RUN go mod tidy

# Build the application
RUN go build -o main .

# Run stage
FROM alpine:3.19

WORKDIR /app

# Install FFmpeg and other runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    ca-certificates \
    tzdata

# Copy the binary from builder
COPY --from=builder /app/main .

# Create uploads directory
RUN mkdir -p uploads && chmod 755 uploads

# Set Environment Variables
ENV GIN_MODE=release
ENV PORT=3000

EXPOSE 3000

# Start the application
CMD ["./main"]
