# PushkarPath (పుష్కరపథం)

> **Real-time Parking Discovery, Navigation & Gate Occupancy Management System for Godavari Pushkaralu 2027 (Rajahmundry, Andhra Pradesh)**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21.0-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.7.0-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7.5-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.14-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## What is PushkarPath?

The **Godavari Pushkaralu** is a monumental 12-day river festival occurring once every 12 years. In 2027, over **50 million devotees** are expected to converge upon the historic city of Rajahmundry to take holy dips in the sacred Godavari River.

During peak bathing dates (*Auspicious Muhurthams*), intense vehicular ingress from national highways (NH16, Kovvur bridge corridor, and Kadiyam) threatens gridlock across the urban core. Traditional municipal parking systems fail because:
1. Advance booking creates slot hoarding and gate friction.
2. Pilgrims cannot see real-time parking lot congestion near their desired bathing ghat.
3. Ground volunteers lack instant, tamper-proof tools to admit or divert vehicles.

**PushkarPath** is a production-grade, full-stack municipal traffic and parking coordination system. It features **zero pre-booking**, cryptographically signed digital vehicle passes, atomic MongoDB race-condition prevention at gates, instant WebSocket updates to all mobile devices, cluster crowd pressure analytics, and a cellular automaton traffic simulator.

---

## Features

- **Real-Time Parking Discovery**: Instant live capacity counters for 44+ parking lots across Rajahmundry, color-coded by occupancy (Green `<75%`, Amber `75-99%`, Red `Full`).
- **Cryptographic QR Gate Passes**: Digital vehicle passes signed with HMAC-SHA256, versioned for instant revocation, and equipped with a 10-second anti-passback cooldown.
- **Interactive Map & Multi-Modal Routing**: Leaflet-powered maps showing bathing ghats, parking lots, driving routes to lots, and walking trails to ghats with Telugu naming support.
- **Turn-by-Turn Navigation with "Demo Drive"**: Simulated vehicle navigation along OSRM polylines with speech alerts, remaining distance, ETA, and re-routing.
- **Volunteer Gate Scanner**: Web-based mobile camera QR scanner for ground volunteers at entry/exit checkpoints with atomic updates and nearest-lot diversion suggestions.
- **Admin Command Center**: Real-time overview of total capacity, city-wide occupancy %, cluster crowd pressure per ghat, fullest lots, staff assignment, and audited manual count overrides.
- **Synthetic Traffic Simulator**: Cellular automaton engine simulating vehicle ingress along NH16 Diwancheruvu, Godavari Fourth Bridge, and Kadiyam corridors with dynamic arrival sliders.

---

## Tech Stack

| Component | Technology | Version | Description |
|---|---|---|---|
| **Frontend** | React | 18.3.1 | Single-page application with portal routing |
| **Build Tool** | Vite | 5.4.2 | Ultra-fast HMR and bundle optimization |
| **Styling** | Tailwind CSS | 3.4.14 | Responsive utility classes & custom theme |
| **Maps** | Leaflet / React-Leaflet | 1.9.4 | Interactive maps with custom SVG markers |
| **Backend** | Node.js & Express | 18+ / 4.21.0 | RESTful API server with Helmet & Compression |
| **Database** | MongoDB & Mongoose | 8.7.0 | Document storage with atomic $inc / $expr |
| **Real-time** | Socket.IO | 4.7.5 | Bi-directional event broadcast engine |
| **Security** | JSON Web Tokens & Bcrypt | 9.0.2 / 5.1.1 | Role-based authorization & password hashing |
| **QR Code** | qrcode / HMAC-SHA256 | 1.5.4 / Node crypto | High-density signed QR generation |

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB server (v6.0+) running at `mongodb://127.0.0.1:27017` or a MongoDB Atlas connection URI.
- **Modern Browser**: Chrome, Edge, Safari, or Firefox with camera permissions (required for volunteer QR scanner).

---

## Quick Start

### 1. Clone & Install Dependencies
```bash
# Install root, server, and client dependencies
npm run install:all
```

### 2. Configure Environment
Ensure `server/.env` is configured (defaults are provided for development):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/pushkarpath
JWT_SECRET=pushkarpath-jwt-secret-2027
QR_SECRET=pushkarpath-qr-secret-2027
SEED_STAFF_PASSCODE=pushkar2027
OSRM_BASE_URL=https://router.project-osrm.org
PHOTON_BASE_URL=https://photon.komoot.io
```

### 3. Seed Database
```bash
# Seed 4 ghats, 44 parking lots, and 3 demo staff accounts
npm run seed
```

### 4. Start Development Servers
```bash
# Concurrently runs Express (port 5000) and Vite (port 5173)
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## Available NPM Scripts

| Command | Action |
|---|---|
| `npm run install:all` | Installs root, client, and server dependencies |
| `npm run dev` | Runs backend and frontend concurrently in development mode |
| `npm run build` | Compiles production bundle for client into `client/dist` |
| `npm start` | Starts Express server in production mode |
| `npm run seed` | Seeds parking lots, ghats, and demo accounts |
| `npm run reset` | Drops database collections and re-seeds cleanly |
| `npm run test:api` | Executes acceptance criteria test suite (11 test suites) |
| `npm run geocode` | Queries Photon API for approximate coordinates verification |

---

## Demo Accounts

All pre-seeded demo accounts use the standard password `pushkar2027`:

| Role | Portal URL | Login Identifier | Passcode / Credentials |
|---|---|---|---|
| **Pilgrim** | `/auth/login` | Any 10-digit mobile (e.g. `9876543210`) | OTP: `123456` |
| **Volunteer (Entry)** | `/staff/login` | `VOL-01` | `pushkar2027` (Assigned: PKG-01 Entry) |
| **Volunteer (Exit)** | `/staff/login` | `VOL-02` | `pushkar2027` (Assigned: PKG-01 Exit) |
| **Admin** | `/staff/login` | `ADMIN-01` | `pushkar2027` (District Central Control) |
| **Guest** | `/` | No login required | Read-only public availability & routes |

---

## 3-Minute Demo Script

Follow this script to demonstrate all features during hackathon evaluations:

1. **Guest View (30s)**:
   - Open [http://localhost:5173](http://localhost:5173).
   - Click **"Continue as Guest"**.
   - Review sacred ghats with authentic Telugu typography (*పుష్కర్ ఘాట్*, *కోటిలింగాల రేవు*).
   - Browse the 44 parking lots with live availability badges and distance indicators.

2. **Pilgrim Login & Smart Navigation (20s)**:
   - Click **Login** → Enter mobile number `9876543210` → Submit OTP `123456`.
   - Open **Interactive Map**: notice green/amber/red lot markers.
   - Click **Pushkar Ghat** → Click **"Find Parking"** to see closest lots.
   - Select **PKG-01** → Click **"Get Route"** to view combined Driving + Walking trail.
   - Click **"Demo Drive"** to start simulated GPS navigation with voice guidance.

3. **Digital Vehicle Pass (20s)**:
   - Navigate to **"My Vehicles"** → Click **"Register Vehicle"**.
   - Enter `AP28AB1234`, vehicle type `Car`.
   - View generated tamper-proof QR code pass with status **"Not Parked"**.

4. **Volunteer Entry Scan (30s)**:
   - Open a new incognito window or separate browser tab.
   - Navigate to `/staff/login` → Login as `VOL-01` / `pushkar2027`.
   - Click **"Scan Entry"** (or paste the QR JSON payload / camera scan).
   - Watch the green admission confirmation: *Entry Permitted for AP28AB1234 at PKG-01*.
   - Switch back to the Pilgrim / Guest tab: observe PKG-01 occupied count increment by 1 in real time!

5. **Volunteer Exit Scan (20s)**:
   - Open another tab → Login as `VOL-02` / `pushkar2027`.
   - Scan the same vehicle pass at the exit gate.
   - System calculates duration (e.g., *1 min*) and logs exit.
   - Watch the occupied counter on Pilgrim Map decrement back instantaneously.

6. **Admin Command Center (30s)**:
   - Login as `ADMIN-01` / `pushkar2027` at `/staff/login`.
   - Review the **Crowd Pressure Overview** showing cluster occupancy percentages for each ghat.
   - Select **PKG-01** → Click **"Correct Occupancy"** → Set count to `15` with justification *"Physical count confirmed by SI"*.
   - View the immutable audit trail under **Audit Logs**.

7. **Traffic Simulation (30s)**:
   - Click **"Simulation"** on the admin menu.
   - Click **"Start Simulation"**.
   - Watch synthetic vehicles travel down NH16 and Kovvur corridors toward lots.
   - Adjust the **Arrival Rate Slider** to increase corridor density.
   - Note the prominent orange disclaimer: *"Synthetic Traffic Simulation — Data is simulated for demonstration"*.

---

## Free Map Services & Usage Limits

PushkarPath is built entirely on open, zero-cost mapping infrastructure:
- **OpenStreetMap Tiles**: Free tile usage via CartoDB / OSM servers with proper attribution.
- **OSRM (Open Source Routing Machine)**: Public demo routing service (`router.project-osrm.org`) for road geometry and driving routes.
- **Photon Geocoding (Komoot)**: OpenStreetMap-based geocoding search (`photon.komoot.io`).

### Production Resilience & Proxy Layer:
- **Rate-Limited Leaky Bucket**: Outgoing requests to OSRM and Photon are throttled to 1 request per second.
- **Server Micro-Proxy**: All client requests route through `/api/map/route` and `/api/map/search` to avoid CORS and browser blocks.
- **In-Memory LRU Cache**: Repeated route calculations and frequent searches are cached in memory.
- **User-Agent Compliance**: Every outgoing query includes `User-Agent: PushkarPath/1.0 (pushkarpath-demo@example.com)`.
- **Zero-Code Failover**: If a public server experiences downtime, URLs can be switched in `server/.env` without rebuilding client code.

---

## Project Structure

```
parking_project3/
├── client/                      # React 18 + Vite frontend
│   ├── public/                  # Static assets and ghat imagery
│   │   └── photos/              # Holy ghat photos
│   └── src/
│       ├── components/          # UI components (Toranam, LotCard, GhatCard, etc.)
│       │   └── map/             # Leaflet MapView and custom LotMarkers
│       ├── lib/                 # Client utilities (api.js, auth.jsx, socket.js)
│       └── pages/               # Portal pages (Guest, Pilgrim, Staff, Admin, Sim)
│           ├── admin/           # Admin command center & audit logs
│           ├── pilgrim/         # Pilgrim discovery, vehicles & route navigation
│           └── volunteer/       # Volunteer scanner interface
├── server/                      # Express backend application
│   ├── lib/                     # Core libraries
│   │   ├── mapServices.js       # OSRM & Photon proxy with rate limit & cache
│   │   ├── qr.js                # Cryptographic HMAC signing & verification
│   │   └── socketManager.js     # Socket.IO broadcasting manager
│   ├── middleware/              # Auth & role-based access control
│   ├── models/                  # Mongoose schemas (User, ParkingLot, Ghat, Vehicle, etc.)
│   ├── routes/                  # Express REST routers
│   ├── scripts/                 # Utility scripts (geocode.js verification)
│   ├── seed/                    # Database seed scripts and Rajahmundry data
│   └── sim/                     # Cellular automaton traffic simulation engine
├── tests/                       # Test suites
│   └── api-tests.js             # Built-in HTTP integration test runner
└── docs/                        # Engineering documentation
    ├── architecture.md          # Mermaid architecture and real-time topology
    ├── data-model.md            # Mermaid ER diagram & schema dictionary
    ├── qr-scan-flow.md          # Flowchart of gate verification & admission
    └── admin-correction.md      # Sequence diagram of admin overrides
```

---

## Architecture Documentation

For in-depth diagrams, database schemas, and state workflows, refer to the documents in `docs/`:
- **[System Architecture](docs/architecture.md)**
- **[Data Model & Schema](docs/data-model.md)**
- **[QR Scan Admission Flowchart](docs/qr-scan-flow.md)**
- **[Admin Correction Sequence](docs/admin-correction.md)**

---

## License

This project is licensed under the [MIT License](LICENSE).
Built with devotion for Godavari Pushkaralu 2027.
