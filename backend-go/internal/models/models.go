package models

import "time"

type Video struct {
	ID           string    `json:"id" db:"id"`
	Slug         string    `json:"slug" db:"slug"`
	Title        string    `json:"title" db:"title"`
	OriginalName string    `json:"original_name" db:"original_name"`
	VideoURL     string    `json:"video_url" db:"video_link"`
	ThumbnailURL string    `json:"thumbnail_url" db:"thumbnail"`
	Thumbnails   []string  `json:"thumbnails"`
	FileSize     string    `json:"file_size" db:"file_size"`
	Duration     string    `json:"duration" db:"duration"`
	Views        int       `json:"views" db:"views"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type Visitor struct {
	ID               string    `json:"id" db:"id"`
	Slug             string    `json:"slug" db:"slug"`
	IP               string    `json:"ip" db:"ip"`
	OS               string    `json:"os" db:"os"`
	Browser          string    `json:"browser" db:"browser"`
	Country          string    `json:"country" db:"country"`
	VisitedAt        time.Time `json:"visited_at" db:"visited_at"`
	TotalLinksOpened int       `json:"total_links_opened" db:"total_links_opened"`
}
