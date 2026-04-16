# PrithviX ERP

PrithviX ERP is a full-stack agri-dealer management system for rural agricultural input businesses. It helps dealers and staff manage farmers, inventory, credit (udhaar), analytics, and advisory workflows from a single dashboard.

## What This ERP Solves

- Centralizes farmer records, visit history, and notes
- Tracks inventory levels, product categories, variants, and stock status
- Manages credit exposure and payment collection
- Provides dashboard and analytics views for decision support
- Includes multilingual AI-style agronomy chat (mocked responses)
- Supports role-based usage for dealer and staff users

## Product Modules

- Authentication: dealer and staff login
- Dashboard: KPIs, latest activities, overdue alerts
- Farmers: searchable list, detailed profile, notes, visit history
- Inventory: product list, stock stats, product add flow (dealer-only)
- Credit: dues, overdue records, payment recording
- Analytics: sales trends, farmer growth, collections, inventory mix, map view
- AI Chat: session-based multilingual assistant-style responses
- Settings: profile, staff list, subscription details

## Tech Stack

- Frontend: React (Create React App), Tailwind CSS, Framer Motion, Recharts, Leaflet
- Backend: FastAPI, Uvicorn
- Database: Supabase Postgres (via `supabase-py`)
- Auth: JWT Bearer token

## Repository Structure

```text
.
├── backend/
│   ├── requirements.txt
│   └── server.py
├── frontend/
│   ├── package.json
│   └── src/
├── supabase_migration.sql
├── backend_test.py
└── memory/
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- A Supabase project (cloud)

## 1. Configure Supabase

1. Create a Supabase project.
2. Open SQL Editor in Supabase.
3. Run the migration from `supabase_migration.sql`.
4. Copy these values from Supabase Project Settings -> API:
	 - Project URL
	 - service_role key

## 2. Configure Backend Environment

Create `backend/.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_SECRET

FRONTEND_URL=http://localhost:3000

ADMIN_EMAIL=dealer@prithvix.com
ADMIN_PASSWORD=dealer123
STAFF_USERNAME=staff01
STAFF_PASSWORD=staff123
```

Notes:
- `SUPABASE_SERVICE_KEY` is required by backend server-side queries.
- Seed users are created/updated at backend startup.

## 3. Run Backend Locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Backend health check:

```text
http://localhost:8000/api/health
```

## 4. Configure Frontend Environment

Create `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

## 5. Run Frontend Locally

```bash
cd frontend
npm install
npm start
```

Frontend app URL:

```text
http://localhost:3000
```

## Default Login Credentials (Seeded)

- Dealer:
	- Email: `dealer@prithvix.com`
	- Password: `dealer123`
- Staff:
	- Username: `staff01`
	- Password: `staff123`

## Optional API Smoke Test

After backend is running, you can run:

```bash
python3 backend_test.py
```

This script validates core health, auth, dashboard, farmers, inventory, credit, analytics, chat, and settings endpoints.

## Common Local Issues

- `SUPABASE_URL` or key missing:
	- Backend fails at startup because these are mandatory.
- CORS issues:
	- Ensure `FRONTEND_URL` in `backend/.env` matches the frontend origin.
- Frontend cannot call API:
	- Ensure `REACT_APP_BACKEND_URL` is set and backend runs on that URL.
- Port already in use:
	- Change ports or stop the process using 3000/8000.

## Current Status

- Supabase-backed backend with seeded ERP data
- Full frontend module coverage for dealer/staff workflows
- Ready for local development and iterative feature extension