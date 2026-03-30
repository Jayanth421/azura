# Azera

Mobile-first React app to explore campus stalls and post your own stall after logging in.

## Quick start (Windows PowerShell)

1. Create `server/.env` from `server/.env.example` and set `MONGODB_URI` (MongoDB Atlas recommended).

2. Start the backend API (MongoDB + SMTP email):

```powershell
cd campus-stall-hub
npm.cmd run server
```

3. In a second terminal, start the Vite frontend:

```powershell
cd campus-stall-hub
npm.cmd run dev
```

Frontend: `http://127.0.0.1:5173`  
Backend: `http://127.0.0.1:5174`

## Database

- MongoDB (required): set `MONGODB_URI` (and optionally `MONGODB_DB_NAME`) in `server/.env` / Vercel env vars.
- If you see `querySrv ECONNREFUSED _mongodb._tcp...` with a `mongodb+srv://` URI, set `DNS_SERVERS` in `server/.env` (comma-separated) or fix your system DNS.

## Email (verification + password reset)

- SMTP is required for real emails. Configure it in `server/.env` below.
- Local dev workaround: set `MAIL_MODE=outbox` to write emails to `server/outbox/` instead of sending.

## Environment

- Server env file: `server/.env` (start from `server/.env.example`)

### SMTP

Fill these in `server/.env` to enable SMTP sending.

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### Admin

- Set `ADMIN_TOKEN` in `server/.env`
- Visit `/admin` and paste the token to view mail + traffic dashboards.

### Cloudinary (image storage)

- Set `CLOUDINARY_URL` in `server/.env`
- Format: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`

## Build

```powershell
npm.cmd run build
```

## Deploy (Vercel)

This repo is a Vite SPA + a Node API mounted at `/api/*` (Vercel Serverless Function).

- In Vercel, set the **Root Directory** to `campus-stall-hub`
- Build Command: `npm run build`
- Output Directory: `dist`

### Environment variables (Vercel)

Set these in the Vercel Project Settings (the `server/.env` file is only for local dev):

- `MONGODB_URI` (MongoDB Atlas connection string recommended)
- `MONGODB_DB_NAME` (optional; default: `azera`)
- `FRONTEND_BASE_URL` (your deployed site URL, used in email links)
- `CLOUDINARY_URL`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Optional: `MAIL_MODE=outbox` (writes emails to the outbox instead of SMTP)
- Optional: `ADMIN_TOKEN`

### Database note

The backend uses MongoDB, so data persists in your MongoDB provider (not on Vercel's ephemeral filesystem).
