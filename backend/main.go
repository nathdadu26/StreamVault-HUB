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
	ID        string        `json:"id"`
	Stage     string        `json:"stage"`
	Progress  int           `json:"progress"`
	Error     string        `json:"error,omitempty"`
	Result    *UploadResult `json:"result,omitempty"`
	Completed bool          `json:"completed"`
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
	Thumbnail1   *string           `json:"thumbnail_1"`
	Thumbnail2   *string           `json:"thumbnail_2"`
	Thumbnail3   *string           `json:"thumbnail_3"`
	Thumbnail4   *string           `json:"thumbnail_4"`
	Thumbnail5   *string           `json:"thumbnail_5"`
	UploadedAt   string            `json:"uploadedAt"`
	CreatedAt    string            `json:"created_at"`
	Views        int               `json:"views"`
}

var jobs = make(map[string]*JobStatus)

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
		job, ok := jobs[id]
		if !ok {
			c.JSON(404, gin.H{"error": "Job not found"})
			return
		}
		c.JSON(200, job)
	})

	// Start Telegram Worker
	go startTelegramWorker()

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	r.Run(":" + port)
}

func updateJob(id, stage string, progress int, err error) {
	if job, ok := jobs[id]; ok {
		job.Stage = stage
		job.Progress = progress
		if err != nil {
			job.Error = err.Error()
			job.Completed = true
			log.Printf("[Job %s] Error: %v", id, err)
		} else {
			log.Printf("[Job %s] Stage: %s (%d%%)", id, stage, progress)
		}
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

func handleUpload(c *gin.Context) {
	file, err := c.FormFile("video")
	if err != nil {
		c.JSON(400, gin.H{"error": "No video file provided"})
		return
	}

	timestamp := time.Now().Unix()
	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".mp4"
	}

	renamedFilename := fmt.Sprintf("TG-@atoz_links-VID-%d%s", timestamp, ext)
	jobID := fmt.Sprintf("%d-%s", timestamp, strings.ReplaceAll(file.Filename, " ", "_"))

	jobs[jobID] = &JobStatus{
		ID:       jobID,
		Stage:    "Uploading to Bunny Stream",
		Progress: 5,
	}

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

	// Move to Bunny Stream background pipeline
	go processBunnyWorkflow(jobID, tempPath, file.Filename, renamedFilename, timestamp)

	c.JSON(200, gin.H{"jobId": jobID})
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
		updateJob(jobID, "Failed", 5, fmt.Errorf("Bunny Stream API credentials (BUNNY_STREAM_LIBRARY_ID / BUNNY_STREAM_API_KEY) are missing"))
		return
	}

	// STAGE 1: Uploading to Bunny Stream
	updateJob(jobID, "Uploading to Bunny Stream", 10, nil)

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

	client := &http.Client{Timeout: 60 * time.Second}
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

	videoID := bunnyVid.GUID
	log.Printf("[Job %s] Created Bunny Stream video GUID: %s", jobID, videoID)

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
			updateJob(jobID, "Transcoding failed", curProgress, fmt.Errorf("Bunny Stream transcoding failed (status 5)"))
			return
		}
		if stData.Status == 4 || stData.EncodeProgress == 100 {
			transcodeFinished = true
			break
		}
	}

	if !transcodeFinished {
		updateJob(jobID, "Transcoding timed out", 60, fmt.Errorf("Bunny Stream transcoding timed out after 30 minutes"))
		return
	}

	if cfg.BunnyStorageZoneName == "" || cfg.BunnyStoragePassword == "" {
		updateJob(jobID, "Storage Zone missing", 60, fmt.Errorf("Bunny Storage Zone credentials (BUNNY_STORAGE_ZONE_NAME / BUNNY_STORAGE_PASSWORD) are missing"))
		return
	}

	// STAGE 3: Downloading ZIP Package
	updateJob(jobID, "Downloading ZIP Package", 65, nil)

	zipURL := fmt.Sprintf("https://storage.bunnycdn.com/%s/%s/?accessKey=%s&download", cfg.BunnyStorageZoneName, videoID, cfg.BunnyStoragePassword)
	log.Printf("[Job %s] Downloading ZIP package...", jobID)

	zipReq, _ := http.NewRequest("GET", zipURL, nil)
	zipResp, err := client.Do(zipReq)
	if err != nil || zipResp.StatusCode != 200 {
		statusText := "error"
		if zipResp != nil {
			statusText = fmt.Sprintf("HTTP %d", zipResp.StatusCode)
			zipResp.Body.Close()
		}
		updateJob(jobID, "ZIP download failed", 65, fmt.Errorf("failed to download ZIP package from Bunny Stream (%s)", statusText))
		return
	}

	zipPath := filepath.Join("uploads", fmt.Sprintf("package-%s.zip", jobID))
	outZip, err := os.Create(zipPath)
	if err != nil {
		zipResp.Body.Close()
		updateJob(jobID, "Failed creating ZIP file", 65, err)
		return
	}
	_, err = io.Copy(outZip, zipResp.Body)
	outZip.Close()
	zipResp.Body.Close()
	if err != nil {
		os.Remove(zipPath)
		updateJob(jobID, "Failed saving ZIP file", 65, err)
		return
	}
	defer os.Remove(zipPath)

	// STAGE 4: Extracting Files
	updateJob(jobID, "Extracting Files", 75, nil)

	extractDir := filepath.Join("uploads", fmt.Sprintf("extracted-%s", jobID))
	os.MkdirAll(extractDir, 0755)
	defer os.RemoveAll(extractDir)

	extractedFiles, err := unzipFile(zipPath, extractDir)
	if err != nil {
		updateJob(jobID, "Extraction failed", 75, fmt.Errorf("failed extracting ZIP package: %v", err))
		return
	}

	log.Printf("[Job %s] Extracted %d files", jobID, len(extractedFiles))

	mp4Map := make(map[string]string)
	var imgPaths []string

	for _, fpath := range extractedFiles {
		ext := strings.ToLower(filepath.Ext(fpath))
		fname := strings.ToLower(filepath.Base(fpath))

		if ext == ".mp4" {
			q := "mp4"
			if strings.Contains(fname, "1080") {
				q = "1080p"
			} else if strings.Contains(fname, "720") {
				q = "720p"
			} else if strings.Contains(fname, "480") {
				q = "480p"
			} else if strings.Contains(fname, "360") {
				q = "360p"
			} else if strings.Contains(fname, "280") || strings.Contains(fname, "240") {
				q = "280p"
			} else {
				q = strings.TrimSuffix(filepath.Base(fpath), filepath.Ext(fpath))
			}
			mp4Map[q] = fpath
		} else if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp" {
			imgPaths = append(imgPaths, fpath)
		}
	}

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
	var mainVideoURL string

	preferredQualities := []string{"1080p", "720p", "480p", "360p", "280p", "mp4"}
	for q, localPath := range mp4Map {
		r2Key := fmt.Sprintf("videos/%d/%s", timestamp, filepath.Base(localPath))
		url, err := uploadToR2(ctx, s3Client, localPath, r2Key, "video/mp4")
		if err != nil {
			updateJob(jobID, "R2 video upload failed", 85, fmt.Errorf("failed uploading %s to R2: %v", filepath.Base(localPath), err))
			return
		}
		mp4R2Map[q] = url
	}

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

	uploadImgToR2 := func(localPath string) string {
		if localPath == "" {
			return ""
		}
		contentType := "image/jpeg"
		if strings.HasSuffix(localPath, ".png") {
			contentType = "image/png"
		} else if strings.HasSuffix(localPath, ".webp") {
			contentType = "image/webp"
		}
		r2Key := fmt.Sprintf("thumbnails/%d/%s", timestamp, filepath.Base(localPath))
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
	var primaryPath string
	for _, p := range mp4Map {
		primaryPath = p
		break
	}
	if primaryPath != "" {
		durationStr = getDuration(primaryPath)
	}

	var totalSizeBytes int64
	for _, p := range mp4Map {
		fi, err := os.Stat(p)
		if err == nil {
			totalSizeBytes += fi.Size()
		}
	}
	if totalSizeBytes == 0 {
		fi, err := os.Stat(tempPath)
		if err == nil {
			totalSizeBytes = fi.Size()
		}
	}
	fileSizeMB := fmt.Sprintf("%.2f MB", float64(totalSizeBytes)/(1024*1024))

	// STAGE 6: Saving Metadata to Cloudflare D1
	updateJob(jobID, "Saving Metadata to Cloudflare D1", 95, nil)

	slug := generateRandomSlug(18)
	nowISO := time.Now().Format(time.RFC3339)

	stringOrNil := func(s string) *string {
		if s == "" {
			return nil
		}
		return &s
	}

	titleWithoutExt := strings.TrimSuffix(originalFilename, filepath.Ext(originalFilename))

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
		if err == nil {
			d1Resp.Body.Close()
		}
	}

	// STAGE 7: Completed
	updateJob(jobID, "Completed", 100, nil)
	if job, ok := jobs[jobID]; ok {
		job.Completed = true
		job.Result = result
	}
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
