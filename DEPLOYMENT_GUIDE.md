# PushkarPath Deployment Guide

PushkarPath is structured as a unified full-stack application. The Node.js Express backend serves both the REST API, Socket.IO WebSockets, and the compiled React frontend from a single port.

---

## Option 1: Render.com (Recommended — 100% Free & Fast)

Render supports persistent WebSockets, background tasks, and zero-dependency in-memory mock databases.

### Steps:
1. Push your repository to **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "PushkarPath 2027 Full Stack"
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git branch -M main
   git push -u origin main
   ```
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Set the settings:
   - **Name**: `pushkarpath`
   - **Environment**: `Node`
   - **Region**: Any (e.g., Singapore / Frankfurt / Oregon)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. Under **Environment Variables**, add:
   - `DEMO_MODE` = `true`
   - `NODE_VERSION` = `20.11.0`
   - `SEED_STAFF_PASSCODE` = `pushkar2027`
7. Click **Create Web Service**.
   *Render will build the React client, seed all 11 Ghats and 36 lots, and launch in ~1-2 minutes.*

---

## Option 2: Railway.app (Instant 1-Click)

1. Open [Railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select this repository.
4. Railway will automatically detect the root `package.json` and `Dockerfile` or `Procfile`.
5. Under Variables, add:
   - `DEMO_MODE` = `true`
   - `SEED_STAFF_PASSCODE` = `pushkar2027`
6. Click **Deploy**.

---

## Option 3: Local / VPS / Cloud Server (PM2)

```bash
# 1. Install dependencies
npm install

# 2. Build production frontend
npm run build

# 3. Start server with PM2 or Node
node server/index.js
# Or with PM2:
# pm2 start server/index.js --name pushkarpath
```
Your app will be live at `http://localhost:5000`.

