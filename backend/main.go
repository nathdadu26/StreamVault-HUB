package main

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
)

type Config struct {
	R2AccountID          string
	R2AccessKeyID        string
	R2SecretAccessKey    string
	R2BucketName         string
	R2PublicURL          string
	FrontendAPIURL       string
	BunnyStreamLibraryID string
	BunnyStreamAPIKey    string
	BunnyStorageZoneName string
	BunnyStoragePassword string
}

var cfg Config

type JobStatus struct {
	ID               string        `json:"id"`
	Stage            string        `json:"stage"`
	Progress         int           `json:"progress"`
	Error            string        `json:"error,omitempty"`
	Result           *UploadResult `json:"result,omitempty"`
	Completed        bool          `json:"completed"`
	BunnyVideoID     string        `json:"bunnyVideoId,omitempty"`
	BunnyUploaded    bool          `json:"bunnyUploaded"`
	ProcessingFailed bool          `json:"processingFailed"`
	FailedStep       string        `json:"failedStep,omitempty"`
	OriginalFilename string        `json:"originalFilename,omitempty"`
	RenamedFilename  string        `json:"renamedFilename,omitempty"`
	Timestamp        int64         `json:"timestamp,omitempty"`
	UploadID         string        `json:"uploadId,omitempty"`
	Fingerprint      string        `json:"fingerprint,omitempty"`
}

type UploadResult struct {
	ID           string            `json:"id"`
	Slug         string            `json:"slug"`
	Title        string            `json:"title"`
	Filename     string            `json:"filename"`
	FileSize     string            `json:"fileSize"`
	Duration     string            `json:"duration"`
	VideoURL     string            `json:"videoUrl"`
	ThumbnailURL string            `json:"thumbnailUrl"`
	Thumbnails   []string          `json:"thumbnails"`
	MP4Qualities map[string]string `json:"mp4Qualities,omitempty"`
	Video240     *string           `json:"video_240,omitempty"`
	Video360     *string           `json:"video_360,omitempty"`
	Video480     *string           `json:"video_480,omitempty"`
	Video720     *string           `json:"video_720,omitempty"`
	Video1080    *string           `json:"video_1080,omitempty"`
	Thumbnail1   *string           `json:"thumbnail_1"`
	Thumbnail2   *string           `json:"thumbnail_2"`
	Thumbnail3   *string           `json:"thumbnail_3"`
	Thumbnail4   *string           `json:"thumbnail_4"`
	Thumbnail5   *string           `json:"thumbnail_5"`
	UploadedAt   string            `json:"uploadedAt"`
	CreatedAt    string            `json:"created_at"`
	Views        int               `json:"views"`
}

var (
	jobsMutex sync.RWMutex
	jobs      = make(map[string]*JobStatus)
)

func setJob(id string, job *JobStatus) {
	jobsMutex.Lock()
	defer jobsMutex.Unlock()
	jobs[id] = job
}

func getJob(id string) (*JobStatus, bool) {
	jobsMutex.RLock()
	defer jobsMutex.RUnlock()
	job, ok := jobs[id]
	return job, ok
}

func updateJob(id, stage string, progress int, err error) {
	jobsMutex.Lock()
	defer jobsMutex.Unlock()
	if job, ok := jobs[id]; ok {
		job.Stage = stage
		job.Progress = progress
		if err != nil {
			job.Error = err.Error()
			if !job.BunnyUploaded {
				job.Completed = true
			}
			log.Printf("[Job %s] Error: %v", id, err)
		} else {
			log.Printf("[Job %s] Stage: %s (%d%%)", id, stage, progress)
		}
	}
}

func markProcessingFailed(id, failedStep string, err error) {
	jobsMutex.Lock()
	defer jobsMutex.Unlock()
	if job, ok := jobs[id]; ok {
		job.ProcessingFailed = true
		job.FailedStep = failedStep
		job.Stage = "Processing Failed"
		errMsg := fmt.Sprintf("Processing Failed: %s", failedStep)
		if err != nil {
			errMsg = fmt.Sprintf("Processing Failed: %s (%v)", failedStep, err)
		}
		job.Error = errMsg
		log.Printf("[Job %s] Processing Failed at step '%s': %v", id, failedStep, err)
	}
}

func generateRandomSlug(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789_"
	b := make([]byte, n)
	_, _ = rand.Read(b)
	for i := 0; i < n; i++ {
		b[i] = letters[int(b[i])%len(letters)]
	}
	return string(b)
}

func main() {
	cfg = Config{
		R2AccountID:          os.Getenv("CLOUDFLARE_ACCOUNT_ID"),
		R2AccessKeyID:        os.Getenv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
		R2SecretAccessKey:    os.Getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
		R2BucketName:         os.Getenv("CLOUDFLARE_R2_BUCKET_NAME"),
		R2PublicURL:          os.Getenv("CLOUDFLARE_R2_PUBLIC_URL"),
		FrontendAPIURL:       os.Getenv("VITE_FRONTEND_API_URL"),
		BunnyStreamLibraryID: os.Getenv("BUNNY_STREAM_LIBRARY_ID"),
		BunnyStreamAPIKey:    os.Getenv("BUNNY_STREAM_API_KEY"),
		BunnyStorageZoneName: os.Getenv("BUNNY_STORAGE_ZONE_NAME"),
		BunnyStoragePassword: os.Getenv("BUNNY_STORAGE_PASSWORD"),
	}

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
	r.GET("/upload/status/:id", func(c *gin.Context) {
		id := c.Param("id")
		job, ok := getJob(id)
		if !ok {
			c.JSON(404, gin.H{"error": "Job not found"})
			return
		}
		c.JSON(200, job)
	})
	r.GET("/upload/verify-bunny/:bunnyVideoId", func(c *gin.Context) {
		bunnyVideoID := c.Param("bunnyVideoId")
		stData, err := verifyBunnyVideo(bunnyVideoID)
		if err != nil || stData == nil {
			c.JSON(404, gin.H{"exists": false, "error": "Video not found on Bunny Stream"})
			return
		}
		c.JSON(200, gin.H{
			"exists":         true,
			"guid":           stData.GUID,
			"status":         stData.Status,
			"encodeProgress": stData.EncodeProgress,
		})
	})
	r.POST("/upload/retry/:id", handleRetryProcessing)

	// Start Telegram Worker
	go startTelegramWorker()

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	r.Run(":" + port)
}

func verifyBunnyVideo(videoID string) (*BunnyVideoStatusResponse, error) {
	if cfg.BunnyStreamLibraryID == "" || cfg.BunnyStreamAPIKey == "" {
		return nil, fmt.Errorf("missing credentials")
	}
	statusURL := fmt.Sprintf("https://video.bunnycdn.com/library/%s/videos/%s", cfg.BunnyStreamLibraryID, videoID)
	stReq, err := http.NewRequest("GET", statusURL, nil)
	if err != nil {
		return nil, err
	}
	stReq.Header.Set("AccessKey", cfg.BunnyStreamAPIKey)
	stReq.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	stResp, err := client.Do(stReq)
	if err != nil {
		return nil, err
	}
	defer stResp.Body.Close()

	if stResp.StatusCode != 200 {
		return nil, fmt.Errorf("Bunny Stream returned status %d", stResp.StatusCode)
	}

	var stData BunnyVideoStatusResponse
	if err := json.NewDecoder(stResp.Body).Decode(&stData); err != nil {
		return nil, err
	}
	return &stData, nil
}

func handleUpload(c *gin.Context) {
	file, err := c.FormFile("video")
	if err != nil {
		c.JSON(400, gin.H{"error": "No video file provided"})
		return
	}

	uploadID := c.PostForm("uploadId")
	bunnyVideoID := c.PostForm("bunnyVideoId")
	fingerprint := c.PostForm("fingerprint")

	// 1. Search existing jobs for duplicate match
	jobsMutex.RLock()
	var existingJob *JobStatus
	for _, j := range jobs {
		if (uploadID != "" && j.UploadID == uploadID) ||
			(bunnyVideoID != "" && j.BunnyVideoID == bunnyVideoID) ||
			(fingerprint != "" && j.Fingerprint == fingerprint) {
			existingJob = j
			break
		}
	}
	jobsMutex.RUnlock()

	if existingJob != nil {
		log.Printf("[Upload Duplicate Protection] Found existing job %s for uploadID=%s / bunnyVideoID=%s / fingerprint=%s", existingJob.ID, uploadID, bunnyVideoID, fingerprint)
		if existingJob.Completed {
			c.JSON(200, gin.H{
				"jobId":         existingJob.ID,
				"bunnyVideoId":  existingJob.BunnyVideoID,
				"bunnyUploaded": true,
				"completed":     true,
				"result":        existingJob.Result,
			})
			return
		}
		if existingJob.BunnyUploaded && existingJob.BunnyVideoID != "" {
			c.JSON(200, gin.H{
				"jobId":         existingJob.ID,
				"bunnyVideoId":  existingJob.BunnyVideoID,
				"bunnyUploaded": true,
				"stage":         existingJob.Stage,
			})
			return
		}
	}

	// 2. If client supplied a bunnyVideoID, verify directly with Bunny Stream API
	if bunnyVideoID != "" {
		st, err := verifyBunnyVideo(bunnyVideoID)
		if err == nil && st != nil && st.GUID != "" {
			log.Printf("[Bunny Stream Verification] Confirmed existing video %s on Bunny Stream (Status=%d, EncodeProgress=%d)", bunnyVideoID, st.Status, st.EncodeProgress)
			timestamp := time.Now().Unix()
			ext := filepath.Ext(file.Filename)
			if ext == "" {
				ext = ".mp4"
			}
			renamedFilename := fmt.Sprintf("TG-@atoz_links-VID-%d%s", timestamp, ext)
			jobID := fmt.Sprintf("%d-%s", timestamp, strings.ReplaceAll(file.Filename, " ", "_"))
			if uploadID != "" {
				jobID = uploadID
			}

			job := &JobStatus{
				ID:               jobID,
				UploadID:         uploadID,
				BunnyVideoID:     bunnyVideoID,
				BunnyUploaded:    true,
				Fingerprint:      fingerprint,
				Stage:            "Waiting for Bunny Stream Transcoding",
				Progress:         25,
				OriginalFilename: file.Filename,
				RenamedFilename:  renamedFilename,
				Timestamp:        timestamp,
			}
			setJob(jobID, job)

			if st.Status == 4 || st.EncodeProgress == 100 || st.Status == 2 || st.Status == 3 {
				go runPostUploadProcessingWithRetry(jobID, bunnyVideoID, file.Filename, renamedFilename, timestamp)
			}

			c.JSON(200, gin.H{
				"jobId":         jobID,
				"bunnyVideoId":  bunnyVideoID,
				"bunnyUploaded": true,
				"stage":         job.Stage,
			})
			return
		}
	}

	timestamp := time.Now().Unix()
	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".mp4"
	}

	renamedFilename := fmt.Sprintf("TG-@atoz_links-VID-%d%s", timestamp, ext)
	jobID := fmt.Sprintf("%d-%s", timestamp, strings.ReplaceAll(file.Filename, " ", "_"))
	if uploadID != "" {
		jobID = uploadID
	}

	job := &JobStatus{
		ID:               jobID,
		UploadID:         uploadID,
		BunnyVideoID:     bunnyVideoID,
		Fingerprint:      fingerprint,
		Stage:            "Uploading to Bunny Stream",
		Progress:         5,
		OriginalFilename: file.Filename,
		RenamedFilename:  renamedFilename,
		Timestamp:        timestamp,
	}
	setJob(jobID, job)

	if err := os.MkdirAll("uploads", 0755); err != nil {
		updateJob(jobID, "Failed to create uploads dir", 0, err)
		c.JSON(500, gin.H{"error": "Internal server error"})
		return
	}

	tempPath := filepath.Join("uploads", fmt.Sprintf("temp-%s%s", jobID, ext))
	if err := c.SaveUploadedFile(file, tempPath); err != nil {
		updateJob(jobID, "Failed to save file", 0, err)
		c.JSON(500, gin.H{"error": "Failed to save file"})
		return
	}

	go processBunnyWorkflow(jobID, tempPath, file.Filename, renamedFilename, timestamp)

	c.JSON(200, gin.H{"jobId": jobID})
}

func handleRetryProcessing(c *gin.Context) {
	id := c.Param("id")
	job, ok := getJob(id)
	if !ok {
		c.JSON(404, gin.H{"error": "Job not found"})
		return
	}

	if job.BunnyVideoID == "" || !job.BunnyUploaded {
		c.JSON(400, gin.H{"error": "Video was not successfully uploaded to Bunny Stream yet"})
		return
	}

	jobsMutex.Lock()
	job.ProcessingFailed = false
	job.Error = ""
	job.FailedStep = ""
	job.Stage = "Waiting for Bunny Stream Transcoding"
	job.Progress = 25
	jobsMutex.Unlock()

	go runPostUploadProcessingWithRetry(job.ID, job.BunnyVideoID, job.OriginalFilename, job.RenamedFilename, job.Timestamp)

	c.JSON(200, gin.H{"status": "retrying", "jobId": id})
}

type BunnyCreateVideoResponse struct {
	GUID string `json:"guid"`
}

type BunnyVideoStatusResponse struct {
	GUID           string `json:"guid"`
	Status         int    `json:"status"`
	EncodeProgress int    `json:"encodeProgress"`
}

func processBunnyWorkflow(jobID, tempPath, originalFilename, renamedFilename string, timestamp int64) {
	defer os.Remove(tempPath)

	if cfg.BunnyStreamLibraryID == "" || cfg.BunnyStreamAPIKey == "" {
		updateJob(jobID, "Failed to upload to Bunny Stream", 5, fmt.Errorf("Bunny Stream API credentials are missing"))
		return
	}

	// STAGE 1: Uploading to Bunny Stream
	log.Printf("[Job %s | Stage] Upload Started", jobID)
	updateJob(jobID, "Uploading to Bunny Stream", 10, nil)

	jobsMutex.RLock()
	job, ok := jobs[jobID]
	jobsMutex.RUnlock()

	var videoID string
	if ok && job != nil && job.BunnyVideoID != "" {
		videoID = job.BunnyVideoID
		log.Printf("[Job %s] Reusing existing Bunny Video ID: %s", jobID, videoID)
	}

	client := &http.Client{Timeout: 60 * time.Second}

	if videoID == "" {
		// 1a. Create Video Entry in Bunny Stream
		createURL := fmt.Sprintf("https://video.bunnycdn.com/library/%s/videos", cfg.BunnyStreamLibraryID)
		reqBody, _ := json.Marshal(map[string]string{"title": renamedFilename})
		createReq, err := http.NewRequest("POST", createURL, bytes.NewBuffer(reqBody))
		if err != nil {
			updateJob(jobID, "Failed to create Bunny request", 10, err)
			return
		}
		createReq.Header.Set("AccessKey", cfg.BunnyStreamAPIKey)
		createReq.Header.Set("Content-Type", "application/json")
		createReq.Header.Set("Accept", "application/json")

		createResp, err := client.Do(createReq)
		if err != nil {
			updateJob(jobID, "Failed to connect to Bunny Stream", 10, err)
			return
		}
		defer createResp.Body.Close()

		if createResp.StatusCode != 200 && createResp.StatusCode != 201 {
			respBytes, _ := io.ReadAll(createResp.Body)
			updateJob(jobID, "Failed creating video on Bunny", 10, fmt.Errorf("Bunny API error (HTTP %d): %s", createResp.StatusCode, string(respBytes)))
			return
		}

		var bunnyVid BunnyCreateVideoResponse
		if err := json.NewDecoder(createResp.Body).Decode(&bunnyVid); err != nil || bunnyVid.GUID == "" {
			updateJob(jobID, "Failed parsing Bunny response", 10, fmt.Errorf("invalid response from Bunny Stream video creation"))
			return
		}

		videoID = bunnyVid.GUID
		log.Printf("[Job %s] Created Bunny Stream video GUID: %s", jobID, videoID)

		// Store BunnyVideoID immediately
		jobsMutex.Lock()
		if j, ok := jobs[jobID]; ok {
			j.BunnyVideoID = videoID
		}
		jobsMutex.Unlock()
	}

	// 1b. Binary Upload to Bunny Stream
	uploadURL := fmt.Sprintf("https://video.bunnycdn.com/library/%s/videos/%s", cfg.BunnyStreamLibraryID, videoID)
	fileStream, err := os.Open(tempPath)
	if err != nil {
		updateJob(jobID, "Failed opening temp file", 15, err)
		return
	}
	defer fileStream.Close()

	uploadReq, err := http.NewRequest("PUT", uploadURL, fileStream)
	if err != nil {
		updateJob(jobID, "Failed creating upload request", 15, err)
		return
	}
	uploadReq.Header.Set("AccessKey", cfg.BunnyStreamAPIKey)
	uploadReq.Header.Set("Content-Type", "application/octet-stream")

	uploadResp, err := client.Do(uploadReq)
	if err != nil {
		updateJob(jobID, "Failed uploading binary to Bunny Stream", 20, err)
		return
	}
	defer uploadResp.Body.Close()

	if uploadResp.StatusCode != 200 && uploadResp.StatusCode != 201 {
		respBytes, _ := io.ReadAll(uploadResp.Body)
		updateJob(jobID, "Bunny upload failed", 20, fmt.Errorf("binary upload error (HTTP %d): %s", uploadResp.StatusCode, string(respBytes)))
		return
	}

	// Bunny Upload Succeeded! Mark BunnyUploaded = true
	log.Printf("[Job %s | Stage] Upload Confirmed by Bunny. Video ID: %s", jobID, videoID)
	jobsMutex.Lock()
	if j, ok := jobs[jobID]; ok {
		j.BunnyUploaded = true
		j.BunnyVideoID = videoID
		j.Stage = "Waiting for Bunny Stream Transcoding"
		j.Progress = 25
		j.Error = ""
	}
	jobsMutex.Unlock()

	// Continue post-upload processing with automatic retry logic
	runPostUploadProcessingWithRetry(jobID, videoID, originalFilename, renamedFilename, timestamp)
}

func runPostUploadProcessingWithRetry(jobID, videoID, originalFilename, renamedFilename string, timestamp int64) {
	maxAttempts := 3
	var lastErr error
	var lastFailedStep string

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		if attempt > 1 {
			log.Printf("[Job %s] Retrying post-upload processing (attempt %d/%d)...", jobID, attempt, maxAttempts)
			time.Sleep(3 * time.Second)
		}

		failedStep, err := runPostUploadProcessing(jobID, videoID, originalFilename, renamedFilename, timestamp)
		if err == nil {
			// Succeeded!
			return
		}

		lastFailedStep = failedStep
		lastErr = err
		log.Printf("[Job %s] Attempt %d failed at step '%s': %v", jobID, attempt, failedStep, err)
	}

	markProcessingFailed(jobID, lastFailedStep, lastErr)
}

var reQualityP = regexp.MustCompile(`(?i)(\d{3,4})p`)
var reQualityNum = regexp.MustCompile(`(?i)(\d{3,4})`)

func detectQuality(filename string) string {
	fname := strings.ToLower(filepath.Base(filename))
	if m := reQualityP.FindStringSubmatch(fname); len(m) > 1 {
		return strings.ToLower(m[1]) + "p"
	}
	if m := reQualityNum.FindStringSubmatch(fname); len(m) > 1 {
		return m[1] + "p"
	}
	return "mp4"
}

func deleteBunnyVideo(libraryID, videoID, apiKey string) error {
	deleteURL := fmt.Sprintf("https://video.bunnycdn.com/library/%s/videos/%s", libraryID, videoID)
	req, err := http.NewRequest("DELETE", deleteURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("AccessKey", apiKey)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 204 {
		respBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Bunny delete API returned status %d: %s", resp.StatusCode, string(respBytes))
	}
	return nil
}

func runPostUploadProcessing(jobID, videoID, originalFilename, renamedFilename string, timestamp int64) (string, error) {
	client := &http.Client{Timeout: 60 * time.Second}

	// STAGE 2: Waiting for Bunny Stream Transcoding
	updateJob(jobID, "Waiting for Bunny Stream Transcoding", 25, nil)

	statusURL := fmt.Sprintf("https://video.bunnycdn.com/library/%s/videos/%s", cfg.BunnyStreamLibraryID, videoID)
	transcodeFinished := false
	maxPolls := 360 // up to 30 minutes polling
	pollCount := 0

	for pollCount < maxPolls {
		time.Sleep(5 * time.Second)
		pollCount++

		stReq, _ := http.NewRequest("GET", statusURL, nil)
		stReq.Header.Set("AccessKey", cfg.BunnyStreamAPIKey)
		stReq.Header.Set("Accept", "application/json")

		stResp, err := client.Do(stReq)
		if err != nil {
			log.Printf("[Job %s] Status poll error: %v", jobID, err)
			continue
		}

		var stData BunnyVideoStatusResponse
		_ = json.NewDecoder(stResp.Body).Decode(&stData)
		stResp.Body.Close()

		log.Printf("[Job %s] Bunny status: %d, progress: %d%%", jobID, stData.Status, stData.EncodeProgress)

		curProgress := 25 + (stData.EncodeProgress * 35 / 100)
		if curProgress > 60 {
			curProgress = 60
		}
		updateJob(jobID, "Waiting for Bunny Stream Transcoding", curProgress, nil)

		if stData.Status == 5 {
			return "Failed while waiting for Bunny Stream Transcoding", fmt.Errorf("Bunny Stream transcoding failed (status 5)")
		}
		if stData.Status == 4 || stData.EncodeProgress == 100 {
			transcodeFinished = true
			break
		}
	}

	if !transcodeFinished {
		return "Failed while waiting for Bunny Stream Transcoding", fmt.Errorf("Bunny Stream transcoding timed out after 30 minutes")
	}

	if cfg.BunnyStorageZoneName == "" || cfg.BunnyStoragePassword == "" {
		return "Failed while downloading ZIP", fmt.Errorf("Bunny Storage Zone credentials are missing")
	}

	// STAGE 3: Downloading ZIP Package
	updateJob(jobID, "Downloading ZIP Package", 65, nil)
	log.Printf("ZIP Download Started")
	log.Printf("[Job %s] ZIP Download Started", jobID)

	zipURL := fmt.Sprintf("https://storage.bunnycdn.com/%s/%s/?accessKey=%s&download", cfg.BunnyStorageZoneName, videoID, cfg.BunnyStoragePassword)

	zipReq, _ := http.NewRequest("GET", zipURL, nil)
	zipResp, err := client.Do(zipReq)
	if err != nil || zipResp.StatusCode != 200 {
		statusText := "error"
		if zipResp != nil {
			statusText = fmt.Sprintf("HTTP %d", zipResp.StatusCode)
			zipResp.Body.Close()
		}
		return "Failed while downloading ZIP", fmt.Errorf("failed to download ZIP package from Bunny Stream (%s)", statusText)
	}

	zipPath := filepath.Join("uploads", fmt.Sprintf("package-%s.zip", jobID))
	outZip, err := os.Create(zipPath)
	if err != nil {
		zipResp.Body.Close()
		return "Failed while downloading ZIP", fmt.Errorf("failed creating ZIP file: %v", err)
	}
	_, err = io.Copy(outZip, zipResp.Body)
	outZip.Close()
	zipResp.Body.Close()
	if err != nil {
		os.Remove(zipPath)
		return "Failed while downloading ZIP", fmt.Errorf("failed saving ZIP file: %v", err)
	}
	defer os.Remove(zipPath)

	log.Printf("ZIP Download Completed")
	log.Printf("[Job %s] ZIP Download Completed", jobID)

	// STAGE 4: Extracting Files
	updateJob(jobID, "Extracting Files", 75, nil)

	extractDir := filepath.Join("uploads", fmt.Sprintf("extracted-%s", jobID))
	os.MkdirAll(extractDir, 0755)
	defer os.RemoveAll(extractDir)

	extractedFiles, err := unzipFile(zipPath, extractDir)
	if err != nil || len(extractedFiles) == 0 {
		if err == nil {
			err = fmt.Errorf("no files extracted from ZIP")
		}
		return "Failed while extracting ZIP", err
	}

	log.Printf("ZIP Extracted")
	log.Printf("[Job %s] ZIP Extracted (%d files)", jobID, len(extractedFiles))

	// Generate single folder slug
	slug := generateRandomSlug(18)

	type mp4FileItem struct {
		quality   string
		localPath string
	}
	var mp4Items []mp4FileItem
	var imgPaths []string

	for _, fpath := range extractedFiles {
		ext := strings.ToLower(filepath.Ext(fpath))
		if ext == ".mp4" {
			q := detectQuality(fpath)
			mp4Items = append(mp4Items, mp4FileItem{quality: q, localPath: fpath})
			log.Printf("Quality Detected: %s", q)
			log.Printf("[Job %s] Quality Detected: %s", jobID, q)
		} else if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp" {
			imgPaths = append(imgPaths, fpath)
		}
	}

	if len(mp4Items) == 0 {
		return "Failed while extracting ZIP", fmt.Errorf("no .mp4 video files found in extracted ZIP")
	}

	// Organize Thumbnails
	var mainThumbPath string
	var thumb1Path, thumb2Path, thumb3Path, thumb4Path, thumb5Path string
	var remainingImgs []string

	for _, img := range imgPaths {
		fname := strings.ToLower(filepath.Base(img))
		if strings.Contains(fname, "thumbnail_1") {
			thumb1Path = img
		} else if strings.Contains(fname, "thumbnail_2") {
			thumb2Path = img
		} else if strings.Contains(fname, "thumbnail_3") {
			thumb3Path = img
		} else if strings.Contains(fname, "thumbnail_4") {
			thumb4Path = img
		} else if strings.Contains(fname, "thumbnail_5") {
			thumb5Path = img
		} else if fname == "thumbnail.jpg" || fname == "thumbnail.png" || fname == "thumbnail.jpeg" || fname == "thumbnail.webp" || strings.HasPrefix(fname, "thumbnail") {
			if mainThumbPath == "" {
				mainThumbPath = img
			} else {
				remainingImgs = append(remainingImgs, img)
			}
		} else {
			remainingImgs = append(remainingImgs, img)
		}
	}

	if mainThumbPath == "" && len(remainingImgs) > 0 {
		mainThumbPath = remainingImgs[0]
		remainingImgs = remainingImgs[1:]
	}

	thumbPtrs := []*string{&thumb1Path, &thumb2Path, &thumb3Path, &thumb4Path, &thumb5Path}
	for _, ptr := range thumbPtrs {
		if *ptr == "" && len(remainingImgs) > 0 {
			*ptr = remainingImgs[0]
			remainingImgs = remainingImgs[1:]
		}
	}

	// STAGE 5: Uploading Files to Cloudflare R2
	updateJob(jobID, "Uploading Files to Cloudflare R2", 85, nil)

	ctx := context.TODO()
	s3Client := getS3Client()

	mp4R2Map := make(map[string]string)
	dateStr := time.Now().Format("0201061504") // DDMMYYHHMM (e.g. 0608261359)

	for _, item := range mp4Items {
		log.Printf("Uploading %s to R2", item.quality)
		log.Printf("[Job %s] Uploading %s to R2", jobID, item.quality)

		ext := filepath.Ext(item.localPath)
		if ext == "" {
			ext = ".mp4"
		}
		newFilename := fmt.Sprintf("TG-@atoz_links-VID-%s-%s%s", item.quality, dateStr, ext)
		// Single folder structure: /{slug}/
		r2Key := fmt.Sprintf("%s/%s", slug, newFilename)

		url, err := uploadToR2(ctx, s3Client, item.localPath, r2Key, "video/mp4")
		if err != nil {
			return "Failed while uploading to R2", fmt.Errorf("failed uploading %s (%s) to R2: %v", item.quality, newFilename, err)
		}
		mp4R2Map[item.quality] = url
	}

	// Determine Main Video URL
	var mainVideoURL string
	preferredQualities := []string{"1080p", "720p", "480p", "360p", "240p", "280p", "mp4"}
	for _, prefQ := range preferredQualities {
		if url, exists := mp4R2Map[prefQ]; exists {
			mainVideoURL = url
			break
		}
	}
	if mainVideoURL == "" {
		for _, url := range mp4R2Map {
			mainVideoURL = url
			break
		}
	}

	// Upload Thumbnails
	log.Printf("Uploading Thumbnails")
	log.Printf("[Job %s] Uploading Thumbnails", jobID)

	uploadImgToR2 := func(localPath string) string {
		if localPath == "" {
			return ""
		}
		contentType := "image/jpeg"
		ext := strings.ToLower(filepath.Ext(localPath))
		if ext == ".png" {
			contentType = "image/png"
		} else if ext == ".webp" {
			contentType = "image/webp"
		}
		// Single folder structure: /{slug}/
		r2Key := fmt.Sprintf("%s/%s", slug, filepath.Base(localPath))
		url, err := uploadToR2(ctx, s3Client, localPath, r2Key, contentType)
		if err != nil {
			log.Printf("[Job %s] Warning uploading thumbnail %s to R2: %v", jobID, localPath, err)
			return ""
		}
		return url
	}

	mainThumbR2 := uploadImgToR2(mainThumbPath)
	t1R2 := uploadImgToR2(thumb1Path)
	t2R2 := uploadImgToR2(thumb2Path)
	t3R2 := uploadImgToR2(thumb3Path)
	t4R2 := uploadImgToR2(thumb4Path)
	t5R2 := uploadImgToR2(thumb5Path)

	var allThumbs []string
	if mainThumbR2 != "" {
		allThumbs = append(allThumbs, mainThumbR2)
	}
	for _, t := range []string{t1R2, t2R2, t3R2, t4R2, t5R2} {
		if t != "" {
			allThumbs = append(allThumbs, t)
		}
	}

	durationStr := "00:00"
	if len(mp4Items) > 0 && mp4Items[0].localPath != "" {
		durationStr = getDuration(mp4Items[0].localPath)
	}

	var totalSizeBytes int64
	for _, item := range mp4Items {
		fi, err := os.Stat(item.localPath)
		if err == nil {
			totalSizeBytes += fi.Size()
		}
	}
	fileSizeMB := fmt.Sprintf("%.2f MB", float64(totalSizeBytes)/(1024*1024))

	// STAGE 6: Saving Metadata to Cloudflare D1
	updateJob(jobID, "Saving Metadata to Cloudflare D1", 95, nil)
	log.Printf("Saving D1")
	log.Printf("[Job %s] Saving D1", jobID)

	nowISO := time.Now().Format(time.RFC3339)

	stringOrNil := func(s string) *string {
		if s == "" {
			return nil
		}
		return &s
	}

	titleWithoutExt := strings.TrimSuffix(originalFilename, filepath.Ext(originalFilename))

	v240Url := stringOrNil(mp4R2Map["240p"])
	if v240Url == nil {
		v240Url = stringOrNil(mp4R2Map["280p"])
	}

	result := &UploadResult{
		ID:           fmt.Sprintf("vid_%d", timestamp),
		Slug:         slug,
		Title:        titleWithoutExt,
		Filename:     renamedFilename,
		FileSize:     fileSizeMB,
		Duration:     durationStr,
		VideoURL:     mainVideoURL,
		ThumbnailURL: mainThumbR2,
		Thumbnails:   allThumbs,
		MP4Qualities: mp4R2Map,
		Video240:     v240Url,
		Video360:     stringOrNil(mp4R2Map["360p"]),
		Video480:     stringOrNil(mp4R2Map["480p"]),
		Video720:     stringOrNil(mp4R2Map["720p"]),
		Video1080:    stringOrNil(mp4R2Map["1080p"]),
		Thumbnail1:   stringOrNil(t1R2),
		Thumbnail2:   stringOrNil(t2R2),
		Thumbnail3:   stringOrNil(t3R2),
		Thumbnail4:   stringOrNil(t4R2),
		Thumbnail5:   stringOrNil(t5R2),
		UploadedAt:   nowISO,
		CreatedAt:    nowISO,
		Views:        0,
	}

	if cfg.FrontendAPIURL != "" {
		d1Payload, _ := json.Marshal(map[string]interface{}{
			"id":           result.ID,
			"slug":         result.Slug,
			"title":        result.Title,
			"videoUrl":     result.VideoURL,
			"thumbnailUrl": result.ThumbnailURL,
			"thumbnails":   result.Thumbnails,
			"mp4Qualities": result.MP4Qualities,
			"video_240":    result.Video240,
			"video_360":    result.Video360,
			"video_480":    result.Video480,
			"video_720":    result.Video720,
			"video_1080":   result.Video1080,
			"thumbnail_1":  result.Thumbnail1,
			"thumbnail_2":  result.Thumbnail2,
			"thumbnail_3":  result.Thumbnail3,
			"thumbnail_4":  result.Thumbnail4,
			"thumbnail_5":  result.Thumbnail5,
			"fileSize":     result.FileSize,
			"duration":     result.Duration,
			"views":        0,
			"likes":        0,
			"dislikes":     0,
			"uploadedAt":   result.UploadedAt,
			"releaseYear":  time.Now().Year(),
			"genres":       []string{"MP4", "HD"},
			"quality":      "1080p",
		})
		d1Req, _ := http.NewRequest("POST", cfg.FrontendAPIURL+"/api/videos", bytes.NewBuffer(d1Payload))
		d1Req.Header.Set("Content-Type", "application/json")
		d1Resp, err := client.Do(d1Req)
		if err != nil || (d1Resp != nil && d1Resp.StatusCode >= 400) {
			if d1Resp != nil {
				d1Resp.Body.Close()
			}
			return "Failed while saving D1", fmt.Errorf("failed saving metadata to Cloudflare D1")
		}
		if d1Resp != nil {
			d1Resp.Body.Close()
		}
	}

	// STAGE 7: Cleanup Bunny Stream
	log.Printf("Deleting Bunny Video")
	log.Printf("[Job %s] Deleting Bunny Video (%s)...", jobID, videoID)
	if err := deleteBunnyVideo(cfg.BunnyStreamLibraryID, videoID, cfg.BunnyStreamAPIKey); err != nil {
		log.Printf("[Job %s] Warning deleting Bunny Video %s: %v", jobID, videoID, err)
	} else {
		log.Printf("[Job %s] Successfully deleted original Bunny Video %s", jobID, videoID)
	}

	log.Printf("Workflow Completed")
	log.Printf("[Job %s] Workflow Completed successfully!", jobID)

	// STAGE 8: Completed
	updateJob(jobID, "Completed", 100, nil)
	jobsMutex.Lock()
	if job, ok := jobs[jobID]; ok {
		job.Completed = true
		job.ProcessingFailed = false
		job.Error = ""
		job.Result = result
	}
	jobsMutex.Unlock()

	return "", nil
}

func unzipFile(src, dest string) ([]string, error) {
	var extractedFiles []string
	r, err := zip.OpenReader(src)
	if err != nil {
		return nil, err
	}
	defer r.Close()

	for _, f := range r.File {
		fpath := filepath.Join(dest, f.Name)

		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			return nil, fmt.Errorf("illegal file path: %s", fpath)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return nil, err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return nil, err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return nil, err
		}

		_, err = io.Copy(outFile, rc)
		outFile.Close()
		rc.Close()
		if err != nil {
			return nil, err
		}

		extractedFiles = append(extractedFiles, fpath)
	}
	return extractedFiles, nil
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
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	_, err = client.PutObject(ctx, &s3.PutObjectInput{
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
	TelegramBotToken     string `json:"telegramBotToken"`
	TelegramChannelURL   string `json:"telegramChannelUrl"`
	TelegramPostInterval int    `json:"telegramPostInterval"`
	TelegramPostUnit     string `json:"telegramPostUnit"`
}

var lastPostTime time.Time

func processQueue() {
	if cfg.FrontendAPIURL == "" {
		return
	}

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

	interval := time.Duration(settings.TelegramPostInterval)
	if settings.TelegramPostUnit == "hours" {
		interval *= time.Hour
	} else {
		interval *= time.Minute
	}

	if !lastPostTime.IsZero() && time.Since(lastPostTime) < interval {
		return
	}

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

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendVideo", settings.TelegramBotToken)

	payload := map[string]string{
		"chat_id":    settings.TelegramChannelURL,
		"video":      video.VideoURL,
		"caption":    fmt.Sprintf("<b>%s</b>\n\nWatch here: %s", video.Title, video.VideoURL),
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
