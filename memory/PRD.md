# Prithvix ERP Dashboard - PRD

## Problem Statement
Build a polished ERP web portal dashboard for Prithvix, an AgriTech dealer management platform for agricultural input dealers in rural India.

## Architecture
- **Frontend**: React.js + Tailwind CSS + Framer Motion + Recharts + Leaflet.js
- **Backend**: FastAPI + MongoDB (motor async driver)
- **Auth**: JWT-based with cookies (dealer + staff roles)
- **Data**: MongoDB with Supabase-ready entity structure

## User Personas
1. **Dealer** - Full access: farmer management, inventory CRUD, credit management, analytics, AI chat, staff management, settings
2. **Staff** - Limited access: view farmers (no edit), view inventory (no add), credit management, analytics, AI chat, view-only settings

## Core Requirements
- Login with dealer/staff tabs
- Dashboard with KPI cards, activity feed, overdue alerts
- Farmer management with search, filters, detail drawer
- Inventory catalog with stock levels, SKU variants
- Udhaar/Credit management with payment recording
- Analytics with charts (line/bar/donut) and Leaflet map
- AI Agronomist chat (mocked responses, multilingual)
- Settings with profile, subscription, staff management
- Dark/light mode toggle
- Responsive design (375px - 1440px)

## What's Been Implemented (April 16, 2026)
- [x] Complete backend API (24+ endpoints, 100% tested)
- [x] JWT authentication (dealer + staff login)
- [x] MongoDB seed data (12 farmers, 10 products, 8 credit records, 180 sales records)
- [x] All 8 pages: Login, Dashboard, Farmers, Inventory, Credit, Analytics, AI Chat, Settings
- [x] Farmer detail drawer with visit history, credit ledger, notes
- [x] Inventory with stock progress bars, SKU variants, add product modal
- [x] Credit management with payment recording modal (Cash/UPI)
- [x] Analytics with sales chart (line/bar toggle), farmer growth, collection donut, inventory breakdown
- [x] Leaflet map with farmer GPS markers (Nashik region)
- [x] AI Chat with session history, prompt starters, multilingual (EN/HI/MR/GU/RJ)
- [x] Settings with profile, subscription plan, staff management, operational toggles
- [x] Dark/light mode toggle
- [x] Page transition animations (Framer Motion)
- [x] Toast notifications
- [x] Loading skeletons
- [x] Empty states
- [x] Responsive sidebar with mobile drawer

## Brand System
- Primary: #1A3C2B
- Accent: #D4A853
- Light BG: #F5F0E8
- Dark BG: #0E1A14
- Headings: DM Serif Display
- Body: Plus Jakarta Sans

## Data Entities (Supabase-ready)
- users (dealers, staff)
- farmers
- farmer_visits
- farmer_notes
- credits
- payments
- inventory (with variants)
- sales_records
- farmer_growth
- activities
- chat_sessions
- chat_messages

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (High)
- Connect to real Supabase backend
- Real AI integration for agronomist chat
- Farmer registration form
- Edit farmer profile
- Inventory edit/delete

### P2 (Medium)
- SMS notification integration
- Report generation/export
- Real-time websocket updates
- Advanced map with heatmap toggle
- Bulk import/export farmers

### Next Tasks
- Supabase migration
- Real AI integration
- Mobile responsiveness fine-tuning
- Push notifications
- PDF invoice generation
