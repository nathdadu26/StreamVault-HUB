package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
)

type Config struct {
	R2AccountID       string
	R2AccessKeyID     string
	R2SecretAccessKey string
	R2BucketName      string
	R2PublicURL       string
	FrontendAPIURL    string
}

var cfg Config

func main() {
	// Load config
	cfg = Config{
		R2AccountID:       os.Getenv("CLOUDFLARE_ACCOUNT_ID"),
		R2AccessKeyID:     os.Getenv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
		R2SecretAccessKey: os.Getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
		R2BucketName:      os.Getenv("CLOUDFLARE_R2_BUCKET_NAME"),
		R2PublicURL:       os.Getenv("CLOUDFLARE_R2_PUBLIC_URL"),
		FrontendAPIURL:    os.Getenv("VITE_FRONTEND_API_URL"), // Need this for worker
	}

	// Setup Gin
	r := gin.Default()

	// CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "online"})
	})

	r.POST("/upload", handleUpload)

	// Start Telegram Worker
	go startTelegramWorker()

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	r.Run(":" + port)
}

func handleUpload(c *gin.Context) {
	file, err := c.FormFile("video")
	if err != nil {
		c.JSON(400, gin.H{"error": "No video file provided"})
		return
	}

	timestamp := time.Now().Unix()
	ext := filepath.Ext(file.Filename)
	originalName := strings.TrimSuffix(file.Filename, ext)
	_ = originalName // Not used for now as per naming convention

	// Naming convention: TG-@atoz_links-VID-{timestamp}.{extension}
	tempFilename := fmt.Sprintf("temp-%d%s", timestamp, ext)
	processedFilename := fmt.Sprintf("TG-@atoz_links-VID-%d.mp4", timestamp)
	
	tempPath := filepath.Join("uploads", tempFilename)
	outputPath := filepath.Join("uploads", processedFilename)

	if err := os.MkdirAll("uploads", 0755); err != nil {
		c.JSON(500, gin.H{"error": "Failed to create uploads dir"})
		return
	}

	if err := c.SaveUploadedFile(file, tempPath); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save temp file"})
		return
	}
	defer os.Remove(tempPath)

	log.Printf("[Processing] Converting %s to MP4...", file.Filename)
	// FFmpeg: Convert to MP4
	cmd := exec.Command("ffmpeg", "-i", tempPath, "-c:v", "libx264", "-crf", "23", "-preset", "fast", "-c:a", "aac", "-b:a", "128k", "-y", outputPath)
	if err := cmd.Run(); err != nil {
		log.Printf("FFmpeg conversion error: %v", err)
		c.JSON(500, gin.H{"error": "Video processing failed"})
		return
	}
	defer os.Remove(outputPath)

	log.Printf("[Processing] Generating thumbnails...")
	// Generate 5 thumbnails
	thumbDir := filepath.Join("uploads", fmt.Sprintf("thumbs-%d", timestamp))
	os.MkdirAll(thumbDir, 0755)
	defer os.RemoveAll(thumbDir)

	thumbCmd := exec.Command("ffmpeg", "-i", outputPath, "-vf", "fps=5/duration,scale=640:360", "-q:v", "2", filepath.Join(thumbDir, "thumb-%d.jpg"))
	if err := thumbCmd.Run(); err != nil {
		log.Printf("Thumbnail generation error: %v", err)
	}

	// Get Duration and Size
	durationStr := getDuration(outputPath)
	fileInfo, _ := os.Stat(outputPath)
	fileSizeMB := fmt.Sprintf("%.2f MB", float64(fileInfo.Size())/(1024*1024))

	// Upload to R2
	ctx := context.TODO()
	s3Client := getS3Client()

	log.Printf("[R2] Uploading video...")
	videoKey := "videos/" + processedFilename
	videoURL, err := uploadToR2(ctx, s3Client, outputPath, videoKey, "video/mp4")
	if err != nil {
		c.JSON(500, gin.H{"error": "R2 Upload failed"})
		return
	}

	log.Printf("[R2] Uploading thumbnails...")
	var thumbURLs []string
	for i := 1; i <= 5; i++ {
		thumbName := fmt.Sprintf("thumb-%d.jpg", i)
		thumbPath := filepath.Join(thumbDir, thumbName)
		if _, err := os.Stat(thumbPath); err == nil {
			key := fmt.Sprintf("thumbnails/thumb-%d-%d.jpg", timestamp, i)
			url, _ := uploadToR2(ctx, s3Client, thumbPath, key, "image/jpeg")
			thumbURLs = append(thumbURLs, url)
		}
	}

	c.JSON(200, gin.H{
		"success": true,
		"video": gin.H{
			"filename":     processedFilename,
			"fileSize":     fileSizeMB,
			"duration":     durationStr,
			"thumbnailUrl": thumbURLs[0],
			"thumbnails":   thumbURLs,
			"videoUrl":     videoURL,
			"uploadedAt":   time.Now().Format(time.RFC3339),
		},
	})
}

func getDuration(path string) string {
	cmd := exec.Command("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path)
	out, err := cmd.Output()
	if err != nil {
		return "00:00"
	}
	f, _ := strconv.ParseFloat(strings.TrimSpace(string(out)), 64)
	seconds := int(f)
	return fmt.Sprintf("%02d:%02d", seconds/60, seconds%60)
}

func getS3Client() *s3.Client {
	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.R2AccountID),
		}, nil
	})

	cfg, _ := config.LoadDefaultConfig(context.TODO(),
		config.WithEndpointResolverWithOptions(r2Resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.R2AccessKeyID, cfg.R2SecretAccessKey, "")),
		config.WithRegion("auto"),
	)

	return s3.NewFromConfig(cfg)
}

func uploadToR2(ctx context.Context, client *s3.Client, path, key, contentType string) (string, error) {
	file, _ := os.Open(path)
	defer file.Close()

	_, err := client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(cfg.R2BucketName),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s/%s", cfg.R2PublicURL, key), nil
}

// Telegram Worker
func startTelegramWorker() {
	log.Println("[Worker] Telegram posting service started")
	for {
		processQueue()
		// Default check every 1 minute
		time.Sleep(1 * time.Minute)
	}
}

type Video struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	VideoURL     string `json:"videoUrl"`
	ThumbnailURL string `json:"thumbnailUrl"`
}

type Settings struct {
	TelegramBotToken    string `json:"telegramBotToken"`
	TelegramChannelURL  string `json:"telegramChannelUrl"`
	TelegramPostInterval int    `json:"telegramPostInterval"`
	TelegramPostUnit     string `json:"telegramPostUnit"`
}

var lastPostTime time.Time

func processQueue() {
	if cfg.FrontendAPIURL == "" {
		return
	}

	// 1. Fetch Settings
	resp, err := http.Get(cfg.FrontendAPIURL + "/api/settings")
	if err != nil {
		log.Printf("[Worker] Error fetching settings: %v", err)
		return
	}
	defer resp.Body.Close()

	var settings Settings
	if err := json.NewDecoder(resp.Body).Decode(&settings); err != nil {
		return
	}

	if settings.TelegramBotToken == "" || settings.TelegramChannelURL == "" {
		return
	}

	// 2. Check Interval
	interval := time.Duration(settings.TelegramPostInterval)
	if settings.TelegramPostUnit == "hours" {
		interval *= time.Hour
	} else {
		interval *= time.Minute
	}

	if !lastPostTime.IsZero() && time.Since(lastPostTime) < interval {
		return
	}

	// 3. Fetch Pending Videos
	resp, err = http.Get(cfg.FrontendAPIURL + "/api/videos?pending=true")
	if err != nil {
		log.Printf("[Worker] Error fetching pending videos: %v", err)
		return
	}
	defer resp.Body.Close()

	var pendingVideos []Video
	if err := json.NewDecoder(resp.Body).Decode(&pendingVideos); err != nil {
		return
	}

	if len(pendingVideos) == 0 {
		return
	}

	video := pendingVideos[0]
	log.Printf("[Worker] Posting video to Telegram: %s", video.Title)

	// 4. Post to Telegram
	// Format: https://api.telegram.org/bot<token>/sendVideo?chat_id=<chat_id>&video=<url>&caption=<caption>
	// We use sendMessage or sendVideo
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendVideo", settings.TelegramBotToken)
	
	// Prepare payload
	payload := map[string]string{
		"chat_id": settings.TelegramChannelURL,
		"video":   video.VideoURL,
		"caption": fmt.Sprintf("<b>%s</b>\n\nWatch here: %s", video.Title, video.VideoURL),
		"parse_mode": "HTML",
	}
	
	jsonPayload, _ := json.Marshal(payload)
	postResp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Printf("[Worker] Telegram post failed: %v", err)
		return
	}
	defer postResp.Body.Close()

	if postResp.StatusCode == 200 {
		log.Printf("[Worker] Successfully posted video %s", video.ID)
		lastPostTime = time.Now()

		// 5. Mark as posted in D1
		updatePayload := map[string]interface{}{
			"id":             video.ID,
			"telegramPosted": true,
		}
		updateJSON, _ := json.Marshal(updatePayload)
		req, _ := http.NewRequest("PUT", cfg.FrontendAPIURL+"/api/videos", bytes.NewBuffer(updateJSON))
		req.Header.Set("Content-Type", "application/json")
		client := &http.Client{}
		client.Do(req)
	} else {
		body, _ := io.ReadAll(postResp.Body)
		log.Printf("[Worker] Telegram API error: %s", string(body))
	}
}

