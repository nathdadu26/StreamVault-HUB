package service

import (
	"fmt"
	"log"
	"os/exec"
)

type VideoProcessor struct {
	R2Bucket string
}

func NewVideoProcessor(bucket string) *VideoProcessor {
	return &VideoProcessor{R2Bucket: bucket}
}

func (p *VideoProcessor) Process(slug, inputPath string) error {
	log.Printf("Processing video: %s", slug)

	// 1. Convert to MP4 if needed (simplified example)
	outputPath := fmt.Sprintf("/tmp/%s.mp4", slug)
	cmd := exec.Command("ffmpeg", "-i", inputPath, "-c:v", "libx264", "-crf", "23", "-preset", "fast", "-c:a", "aac", "-b:a", "128k", outputPath)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to convert video: %w", err)
	}

	// 2. Extract Thumbnails
	for i := 0; i < 5; i++ {
		timeOffset := i * 2 // 0, 2, 4, 6, 8 seconds
		thumbPath := fmt.Sprintf("/tmp/%s_thumb%d.jpg", slug, i)
		thumbCmd := exec.Command("ffmpeg", "-ss", fmt.Sprintf("%d", timeOffset), "-i", outputPath, "-vframes", "1", "-q:v", "2", thumbPath)
		if err := thumbCmd.Run(); err != nil {
			log.Printf("Warning: failed to extract thumb %d: %v", i, err)
		}
	}

	// 3. Upload to R2 (Simplified)
	log.Printf("Uploading %s to R2 bucket: %s", slug, p.R2Bucket)
	
	return nil
}
