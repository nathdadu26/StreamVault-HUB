import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = "uploads";
const thumbsDir = path.join(uploadDir, "thumbs");
const processedThumbsDir = path.join(uploadDir, "processed_thumbs");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir);
if (!fs.existsSync(processedThumbsDir)) fs.mkdirSync(processedThumbsDir);

const upload = multer({ dest: uploadDir });

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
});

app.get("/health", (req, res) => {
  res.json({ status: "online" });
});

app.get("/", (req, res) => {
  res.json({ message: "Koyeb Processing Server is running", status: "online" });
});

app.post("/upload", upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video file uploaded" });
  }

  const { path: tempPath, originalname } = req.file;
  const extension = path.extname(originalname) || ".mp4";
  const timestamp = Date.now();
  const formattedName = `TG-@atoz_links-VID-${timestamp}.mp4`;
  const outputPath = path.join(uploadDir, formattedName);

  try {
    console.log(`[Processing] Starting conversion for ${originalname}...`);
    // 1. Convert to MP4 using FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(tempPath)
        .outputOptions("-c:v libx264", "-crf 23", "-preset fast", "-c:a aac", "-b:a 128k")
        .output(outputPath)
        .on("end", () => {
          console.log("[Processing] Conversion completed.");
          resolve(true);
        })
        .on("error", (err) => {
          console.error("[Processing] Conversion error:", err);
          reject(err);
        })
        .run();
    });

    console.log("[Processing] Generating raw thumbnails...");
    // 2. Generate 5 raw thumbnails with FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(outputPath)
        .screenshots({
          count: 5,
          folder: thumbsDir,
          filename: `raw-thumb-${timestamp}-%i.jpg`,
          size: "640x360",
        })
        .on("end", () => {
          console.log("[Processing] Raw thumbnails extracted.");
          resolve(true);
        })
        .on("error", (err) => {
          console.error("[Processing] Thumbnail extraction error:", err);
          reject(err);
        });
    });

    // 3. Process thumbnails with Sharp
    console.log("[Processing] Optimizing thumbnails with Sharp...");
    const processedThumbPaths = [];
    for (let i = 1; i <= 5; i++) {
      const rawName = `raw-thumb-${timestamp}-${i}.jpg`;
      const rawPath = path.join(thumbsDir, rawName);
      const processedName = `thumb-${timestamp}-${i}.webp`;
      const processedPath = path.join(processedThumbsDir, processedName);

      if (fs.existsSync(rawPath)) {
        await sharp(rawPath)
          .resize(480, 270)
          .webp({ quality: 80 })
          .toFile(processedPath);
        
        processedThumbPaths.push({ path: processedPath, name: processedName });
        fs.unlinkSync(rawPath); // Cleanup raw
      }
    }

    // 4. Upload to R2
    const uploadFileToR2 = async (filePath: string, key: string, contentType: string) => {
      const fileStream = fs.createReadStream(filePath);
      const parallelUploads3 = new Upload({
        client: r2Client,
        params: {
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || "",
          Key: key,
          Body: fileStream,
          ContentType: contentType,
        },
      });
      return parallelUploads3.done();
    };

    // Get metadata
    const stats = fs.statSync(outputPath);
    const fileSize = (stats.size / (1024 * 1024)).toFixed(2) + " MB";
    
    const duration: string = await new Promise((resolve) => {
      ffmpeg.ffprobe(outputPath, (err, metadata) => {
        if (err) return resolve("00:00");
        const seconds = metadata.format.duration || 0;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        resolve(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
      });
    });

    console.log("[R2] Uploading video...");
    const videoKey = `videos/${formattedName}`;
    await uploadFileToR2(outputPath, videoKey, "video/mp4");

    const thumbnails = [];
    const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";

    console.log("[R2] Uploading optimized thumbnails...");
    for (const thumb of processedThumbPaths) {
      const thumbKey = `thumbnails/${thumb.name}`;
      await uploadFileToR2(thumb.path, thumbKey, "image/webp");
      thumbnails.push(`${publicUrlBase}/${thumbKey}`);
      fs.unlinkSync(thumb.path); // Cleanup processed
    }

    // Final Cleanup
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    console.log("[Completed] Video processed and uploaded successfully.");
    res.json({
      success: true,
      video: {
        title: formattedName,
        videoUrl: `${publicUrlBase}/${videoKey}`,
        thumbnailUrl: thumbnails[0] || "",
        thumbnails: thumbnails,
        fileSize,
        duration,
        uploadedAt: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    console.error("[Error] Processing failed:", error);
    // Cleanup on failure
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    res.status(500).json({ error: "Failed to process video", details: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
