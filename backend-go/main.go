package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if exists
	godotenv.Load()

	r := gin.Default()

	// Middleware
	r.Use(gin.Recovery())
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health Check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "online",
		})
	})

	// API Routes
	api := r.Group("/api")
	{
		api.POST("/upload", UploadVideo)
		api.GET("/progress/:id", GetProgress)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	r.Run("0.0.0.0:" + port)
}

func UploadVideo(c *gin.Context) {
	// Placeholder for R2 upload + FFmpeg logic
	c.JSON(http.StatusAccepted, gin.H{
		"message": "Upload started",
		"task_id": "temp-123",
	})
}

func GetProgress(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"progress": 45,
		"status":   "extracting_thumbnails",
	})
}
