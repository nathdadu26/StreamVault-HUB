# AtoZ Links Refactored Architecture

This project is now split into two independent modules for production readiness.

## Structure

- `/frontend`: React + Vite frontend for Cloudflare Pages.
- `/backend`: Go (Golang) processing server for Koyeb (Docker).

## Deployment Steps

### 1. Backend (Koyeb)
- Create a new service on Koyeb.
- Choose "Docker" as the deployment method.
- **Build Context / Work Directory**: Set this to `backend`.
- **Dockerfile Path**: Set this to `Dockerfile` (since it's inside the backend directory).
- Alternatively, if using the root Dockerfile, set Build Context to `.` and Dockerfile path to `Dockerfile`.
- Set the following Environment Variables in Koyeb:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_BUCKET_NAME`
  - `CLOUDFLARE_R2_PUBLIC_URL`
  - `VITE_FRONTEND_API_URL`: Your Cloudflare Pages URL (e.g. `https://atoz-links.pages.dev`). This is required for the Telegram sync worker to fetch videos from D1.

### 2. Frontend (Cloudflare Pages)
- Connect your GitHub repository to Cloudflare Pages.
- Set the Build Command: `npm run build`
- Set the Build Output Directory: `dist`
- Root Directory: `frontend`
- Set Environment Variables:
  - `VITE_KOYEB_PROCESSING_SERVER_URL`: The URL of your Koyeb service (e.g., `https://app-name.koyeb.app`).
- **Cloudflare D1**:
  - Create a D1 database named `atoz-links-db`.
  - Bind it to your Pages project with the variable name `DB`.
  - Run the migration (see `/frontend/functions/schema.sql` if provided, or the app will handle it if initialized).

## Local Development
- Use `docker-compose up` from the root to start both services locally.
- Frontend will be at `http://localhost:5173`.
- Backend will be at `http://localhost:3000`.
