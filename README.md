# 🚀 AI-Powered Logistics Bottleneck Resolution Agent

> An autonomous, evidence-grounded operations copilot that detects supply chain bottlenecks, diagnoses root causes using AI, and orchestrates corrective actions — all with human-in-the-loop governance and a tamper-evident audit trail.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Python](https://img.shields.io/badge/python-3.11+-blue)
![React](https://img.shields.io/badge/react-18.3-61DAFB)
![FastAPI](https://img.shields.io/badge/fastapi-0.110+-009688)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-336791)
![Docker](https://img.shields.io/badge/docker-compose-2496ED)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Option 1: Docker Compose (Recommended)](#option-1-docker-compose-recommended)
  - [Option 2: Manual Local Setup](#option-2-manual-local-setup)
- [Environment Variables](#environment-variables)
- [Seeded Demo Scenarios](#seeded-demo-scenarios)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

Modern freight transport involves fragmented stakeholders — shippers, carriers, customs brokers, warehouse operators, and consignees — interacting through disconnected legacy systems. Operational delays like missing documents, warehouse dispatch cutoffs, carrier delays, and communication breakdowns frequently go unnoticed until scheduled delivery dates are missed.

This system continuously monitors shipments against planned milestones, autonomously detects data inconsistencies and operational bottlenecks, diagnoses root causes using an LLM (powered via **Evolus AI** at `https://api.evolus.ai/`), initiates corrective actions through an allowlisted tool registry, routes sensitive actions to human decision-makers, and records every decision in a tamper-evident audit log.

---

## Key Features

### 🔍 Intelligent Exception Detection
- Automated detection of missing documents, overdue milestones, and weight/consignee discrepancies
- Continuous cross-document reconciliation (Commercial Invoice vs. Packing List)
- Dynamic risk scoring with configurable severity tiers (LOW → CRITICAL)

### 🤖 AI-Powered Diagnosis (Evolus AI)
- Structured diagnostic reasoning via Evolus AI Platform agents
- Prompt-injection protection with `<user_data>` XML fencing (RULE-F02)
- Deterministic fallback mock mode when AI is unavailable
- Four specialized agents: Bottleneck, Customs, Carrier, and Copilot

### 🛡️ Human-in-the-Loop Governance
- Approval gates for consequential operations (rerouting, rebooking, escalation)
- Reviewer sign-off with rationale and timestamped decision logging
- Automatic status cascading to associated exceptions and corrective actions

### 💬 Operational Copilot Chat
- Instant Q&A grounded in verified database records — no hallucination
- Keyboard shortcut access (`Ctrl+J` / `Cmd+J`)
- Context-aware responses based on shipment milestones, documents, and exceptions

### 📄 Document Processing Pipeline
- Upload validation with MIME type and file size enforcement (≤10 MB)
- Regex-based field extraction (invoice number, weight, consignee, dates)
- Automated weight mismatch detection across document pairs

### 📊 Complete Audit Trail
- Immutable logging of every AI inference, tool execution, and human approval
- Filterable by entity type, actor, action, and entity ID
- Full compliance readiness

### 🗺️ Operations Control Center (Frontend)
- Live global logistics map with animated shipment routes
- Real-time metric cards (risk scores, active exceptions, approval queue)
- Command palette (`Ctrl+K`) for rapid shipment search
- 10 dedicated pages covering the full operational workflow

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                      │
│  Dashboard │ Shipments │ Exceptions │ Documents │ Approvals │ Chat  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  HTTP / REST
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (Python 3.11)                    │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  API Routers  │  │   Services   │  │  Agent Orchestrator       │  │
│  │  (9 modules)  │  │  (Shipment)  │  │  (Observe→Reason→Act→    │  │
│  │              │  │              │  │   Verify loop)            │  │
│  └──────────────┘  └──────────────┘  └────────────┬─────────────┘  │
│                                                    │                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────▼─────────────┐  │
│  │  Document     │  │  Risk        │  │  Evolus AI Client         │  │
│  │  Processing   │  │  Scorer      │  │  (Agents + Workflows)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Tool         │  │  SQLAlchemy  │  │  Webhook Gateway          │  │
│  │  Registry     │  │  2.0 Async   │  │  (Evolus Callbacks)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│               PostgreSQL 16 (asyncpg + connection pooling)          │
│  Shipments │ Milestones │ Documents │ Events │ Exceptions │ Audit   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS | Operations Control Center SPA |
| **Backend** | Python 3.11, FastAPI, Pydantic v2 | REST API, Agent Orchestration |
| **Database** | PostgreSQL 16, SQLAlchemy 2.0 (async), asyncpg | Persistent data store |
| **AI Engine** | Evolus AI Platform (Agents + Workflows API) | Diagnostic reasoning |
| **HTTP Client** | httpx (async) | External API communication |
| **Containerization** | Docker, Docker Compose, Nginx | Production packaging |
| **Deployment** | Render (render.yaml Blueprint) | Cloud hosting |

---

## Project Structure

```
├── backend/
│   ├── Dockerfile                    # Backend container image
│   ├── requirements.txt              # Python dependencies
│   ├── app/
│   │   ├── main.py                   # FastAPI app factory & lifespan
│   │   ├── config.py                 # Pydantic Settings (env-driven)
│   │   ├── agents/
│   │   │   ├── orchestrator.py       # AI reasoning loop (Observe→Reason→Act→Verify)
│   │   │   └── prompts.py            # Prompt assembly & formatting
│   │   ├── api/v1/
│   │   │   ├── router.py            # Aggregates all domain routers
│   │   │   ├── shipments.py         # CRUD + filtering for shipments
│   │   │   ├── events.py            # Telemetry event ingestion (idempotent)
│   │   │   ├── documents.py         # Upload, extract, reconcile documents
│   │   │   ├── exceptions.py        # Exception triage & resolution
│   │   │   ├── approvals.py         # Human-in-the-loop decision gates
│   │   │   ├── agent.py             # AI analyze & chat endpoints
│   │   │   ├── audit.py             # Immutable audit log queries
│   │   │   ├── notifications.py     # Outbound stakeholder notifications
│   │   │   └── integrations.py      # Evolus webhook gateway
│   │   ├── db/
│   │   │   └── session.py           # Async engine & session management
│   │   ├── document_processing/
│   │   │   ├── pipeline.py          # Upload validation & file storage
│   │   │   └── validator.py         # Cross-document reconciliation
│   │   ├── integrations/
│   │   │   └── evolus_client.py     # Evolus AI API client (agents, workflows)
│   │   ├── models/
│   │   │   ├── base.py              # SQLAlchemy declarative base
│   │   │   └── entities.py          # All ORM entity models
│   │   ├── monitoring/
│   │   │   └── risk_scorer.py       # Dynamic risk score calculator
│   │   ├── schemas/
│   │   │   ├── domain.py            # Pydantic v2 request/response schemas
│   │   │   └── enums.py             # All domain enumerations
│   │   ├── services/
│   │   │   └── shipment_service.py  # Business logic layer
│   │   └── tools/
│   │       ├── registry.py          # Allowlisted tool registry
│   │       └── handlers.py          # Tool execution handlers
│   └── tests/                        # 15 test modules (pytest + pytest-asyncio)
│
├── frontend/
│   ├── Dockerfile                    # Multi-stage build (Node → Nginx)
│   ├── nginx.conf                    # Production reverse proxy config
│   ├── package.json                  # Node.js dependencies
│   ├── vite.config.ts                # Vite dev server + proxy config
│   ├── tailwind.config.js            # TailwindCSS theme configuration
│   └── src/
│       ├── App.tsx                   # Root app with routing & state
│       ├── pages/                    # 10 page components
│       ├── components/               # 9 component directories
│       └── services/                 # API client & service modules
│
├── scripts/
│   ├── seed_db.py                    # Deterministic 5-scenario database seeder
│   └── test_evolus_inference.py      # Standalone Evolus API verification
│
├── docker-compose.yml                # Full-stack container orchestration
├── render.yaml                       # Render cloud deployment blueprint
├── .env.example                      # Environment variable template
└── .env                              # Local credentials (git-ignored)
```

---

## Getting Started

### Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| **Git** | Any | `git --version` |
| **Docker** | 20.10+ | `docker --version` |
| **Docker Compose** | v2.0+ | `docker compose version` |
| **Python** (manual setup only) | 3.11+ | `python3 --version` |
| **Node.js** (manual setup only) | 20+ | `node --version` |
| **PostgreSQL** (manual setup only) | 14+ | `psql --version` |

---

### Option 1: Docker Compose (Recommended)

This is the fastest way to get the entire stack running. One command spins up PostgreSQL, the FastAPI backend, and the React frontend.

#### Step 1: Clone the Repository

```bash
git clone https://github.com/TEAM-BSVJ/Shipment-Agent.git
cd Shipment-Agent
```

#### Step 2: Create Your Environment File

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```ini
# Evolus AI Configuration
EVOLUS_BASE_URL=https://api.evolus.ai
EVOLUS_API_KEY=your_evolus_api_key_here
EVOLUS_APPLICATION_ID=your_application_id_here
EVOLUS_MODEL=own/qwen3.8-27b

# Database (handled automatically by Docker Compose)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/logistics_db

# Application
APP_ENV=production
LOG_LEVEL=INFO
```

> **Note:** If you don't have Evolus credentials, the system will automatically run in **mock mode** with deterministic AI responses. Everything works without external API access.

#### Step 3: Build and Start All Services

```bash
docker compose up -d --build
```

#### Step 4: Verify All Services Are Healthy

```bash
docker compose ps
```

Expected output:

```
NAME                      IMAGE                STATUS                  PORTS
shipment_agent_db         postgres:16-alpine   Up (healthy)            0.0.0.0:5433->5432/tcp
shipment_agent_backend    project-backend      Up (healthy)            0.0.0.0:8000->8000/tcp
shipment_agent_frontend   project-frontend     Up (healthy)            0.0.0.0:3000->80/tcp
```

#### Step 5: Open the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Operations Control Center |
| **Backend API** | [http://localhost:8000/health](http://localhost:8000/health) | Health check |
| **Swagger Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive API documentation |
| **ReDoc** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | API documentation (alternative) |

> The backend automatically creates all database tables and seeds 5 benchmark shipment scenarios (`SHP-101` to `SHP-105`) on first startup.

#### Common Docker Commands

```bash
# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f backend

# Rebuild after code changes
docker compose up -d --build

# Stop all services
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v
```

---

### Option 2: Manual Local Setup

If you prefer running without Docker (for development / debugging).

#### Step 1: Clone and Set Up the Backend

```bash
git clone https://github.com/TEAM-BSVJ/Shipment-Agent.git
cd Shipment-Agent

# Create a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

#### Step 2: Set Up PostgreSQL

Make sure PostgreSQL is running locally, then create the database:

```bash
sudo -u postgres psql -c "CREATE DATABASE logistics_db;"
```

Or if using your own PostgreSQL credentials:

```bash
createdb logistics_db
```

#### Step 3: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```ini
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/logistics_db
EVOLUS_BASE_URL=https://api.evolus.ai
EVOLUS_API_KEY=your_key_here
EVOLUS_APPLICATION_ID=your_app_id_here
LOG_LEVEL=INFO
```

#### Step 4: Start the Backend

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will:
1. Connect to PostgreSQL
2. Create all database tables automatically
3. Seed 5 benchmark shipment scenarios if the database is empty
4. Start serving at `http://localhost:8000`

Verify it's running:

```bash
curl http://localhost:8000/health
```

#### Step 5: Set Up and Start the Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server starts at `http://localhost:5173` with an automatic proxy to the backend at `http://localhost:8000`.

#### Step 6: (Optional) Seed the Database Manually

If the auto-seeder didn't run or you want to reset the demo data:

```bash
python3 scripts/seed_db.py
```

This creates 5 realistic freight scenarios with shipments, milestones, documents, exceptions, corrective actions, approvals, notifications, and audit logs.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://postgres:postgres@localhost:5432/logistics_db` | PostgreSQL connection string |
| `EVOLUS_BASE_URL` | No | `https://api.evolus.ai` | Evolus AI Platform base URL |
| `EVOLUS_API_KEY` | No | `""` | Evolus API authentication key |
| `EVOLUS_APPLICATION_ID` | No | `""` | Evolus application identifier |
| `EVOLUS_MODEL` | No | `own/qwen3.8-27b` | AI model checkpoint |
| `EVOLUS_MOCK_MODE` | No | `false` | Force mock mode (bypasses AI calls) |
| `APP_ENV` | No | `development` | Environment: `development`, `staging`, `production` |
| `LOG_LEVEL` | No | `INFO` | Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `CORS_ORIGINS` | No | `["http://localhost:5173", ...]` | Allowed CORS origins (JSON array or comma-separated) |
| `MAX_UPLOAD_SIZE_BYTES` | No | `10485760` | Max document upload size (10 MB) |
| `NOTIFICATION_PROVIDER` | No | `mock` | Notification backend: `mock`, `smtp`, `webhook` |
| `VITE_API_URL` | No | `""` | Frontend API base URL (empty = relative proxy) |

---

## Seeded Demo Scenarios

On first startup, the system auto-seeds 5 realistic freight scenarios:

| Tracking # | Route | Mode | Scenario | Risk |
|------------|-------|------|----------|------|
| **SHP-101** | Mumbai → Rotterdam | 🚢 SEA | Missing Commercial Invoice, customs hold approaching | 🔴 HIGH (75) |
| **SHP-102** | Dallas → Austin | ✈️ AIR | Warehouse dispatch overdue by 4.5 hours | 🔴 CRITICAL (95) |
| **SHP-103** | Shanghai → Los Angeles | 🚢 SEA | Weight mismatch: Invoice (250 kg) vs Packing List (310 kg) | 🟠 HIGH (65) |
| **SHP-104** | Detroit → Cleveland | 🚛 ROAD | Healthy baseline — on schedule, no exceptions | 🟢 LOW (15) |
| **SHP-105** | Frankfurt → Chicago | ✈️ AIR | Critical customs hold with resolved escalation | 🟡 MEDIUM (45) |

Each scenario includes pre-populated milestones, documents, tracking events, exceptions, corrective actions, approval records, notifications, and audit log entries.

---

## API Reference

All API endpoints are accessible under the `/api/v1` prefix.

### System Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health and readiness check |
| `GET` | `/` | Service metadata and documentation links |
| `GET` | `/docs` | Swagger UI (interactive API testing) |
| `GET` | `/redoc` | ReDoc API documentation |

### Shipments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/shipments` | List shipments with filters (status, priority, risk, mode, search) |
| `GET` | `/api/v1/shipments/{id}` | Get shipment details with milestones, documents, exceptions |
| `POST` | `/api/v1/shipments` | Register a new shipment |

### Telemetry & Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/shipments/{id}/events` | Ingest tracking event (idempotent) |
| `GET` | `/api/v1/shipments/{id}/events` | List chronological events for a shipment |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/documents/upload` | Upload freight document (PDF/PNG/JPEG) |
| `POST` | `/api/v1/documents/{id}/extract` | Extract fields and run cross-document reconciliation |
| `GET` | `/api/v1/documents/{id}` | Get document metadata and extracted fields |
| `GET` | `/api/v1/shipments/{id}/documents` | List all documents for a shipment |

### Exceptions & Bottlenecks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/exceptions` | List active exceptions (filter by status, risk, shipment) |
| `GET` | `/api/v1/exceptions/{id}` | Get exception details with evidence and root cause |
| `PATCH` | `/api/v1/exceptions/{id}` | Update exception status/root cause, auto-recalculate risk |
| `GET` | `/api/v1/shipments/{id}/exceptions` | List exceptions for a specific shipment |

### Human Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/approvals` | List approval requests (filter by decision status) |
| `GET` | `/api/v1/approvals/{id}` | Get approval details |
| `POST` | `/api/v1/approvals/{id}/decide` | Submit human approval or rejection decision |

### AI Agent

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/agent/analyze` | Run AI diagnostic reasoning cycle on a shipment |
| `POST` | `/api/v1/agent/chat` | Conversational copilot grounded in DB facts |
| `GET` | `/api/v1/agent/tools` | List allowlisted tool schemas |

### Audit Trail & Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/audit` | Query immutable audit logs |
| `GET` | `/api/v1/notifications` | Query outbound stakeholder notifications |

### Platform Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/integrations/evolus/webhook` | Unified webhook gateway for Evolus AI workflow callbacks |

---

## Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| **Dashboard** | `/` | Global logistics map, metric cards, shipment overview |
| **Shipments** | `/shipments` | Full shipment table with filters and create modal |
| **Shipment Detail** | (click on shipment) | Milestone timeline, documents, exceptions, AI analysis |
| **Exception Queue** | `/exceptions` | Active bottlenecks sorted by severity |
| **Document Studio** | `/documents` | Side-by-side document reconciliation |
| **Approval Queue** | `/approvals` | Human-in-the-loop decision gate |
| **Recovery Planner** | `/recovery` | AI-assisted remediation planning |
| **Analytics** | `/analytics` | Operational KPIs and trend charts |
| **Audit Trail** | `/audit` | Complete chronological decision log |
| **Settings** | `/settings` | Platform configuration |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open Command Palette (search shipments) |
| `Ctrl+J` / `Cmd+J` | Open AI Copilot Chat Drawer |

---

## Running Tests

The backend includes 15 test modules covering API endpoints, schemas, models, services, document processing, AI orchestration, and integrations.

```bash
# Activate virtual environment
source .venv/bin/activate

# Run all tests
pytest backend/tests/ -v

# Run specific test modules
pytest backend/tests/test_health.py -v          # Health + CORS tests
pytest backend/tests/test_api_v1.py -v           # Full API endpoint tests
pytest backend/tests/test_api_shipments.py -v    # Shipment CRUD tests
pytest backend/tests/test_orchestrator.py -v     # AI orchestrator tests
pytest backend/tests/test_evolus_client.py -v    # Evolus AI client tests
pytest backend/tests/test_document_checks.py -v  # Document processing tests
pytest backend/tests/test_schemas.py -v          # Pydantic schema validation
pytest backend/tests/test_monitoring.py -v       # Risk scoring tests
pytest backend/tests/test_tools.py -v            # Tool registry tests
pytest backend/tests/test_models.py -v           # ORM entity tests
pytest backend/tests/test_seed_db.py -v          # Database seeder tests
```

---

## Deployment

### Render (Cloud)

The project includes a `render.yaml` blueprint for one-click deployment on [Render](https://render.com):

1. Push the repository to GitHub
2. In Render Dashboard → **New** → **Blueprint**
3. Connect your repository
4. Render auto-detects `render.yaml` and provisions:
   - **Backend**: Docker container from `backend/Dockerfile`
   - **Frontend**: Static site from `frontend/` (npm build → dist)
   - **Database**: Managed PostgreSQL instance

5. Add your Evolus API credentials in the Render Dashboard environment variables:
   - `EVOLUS_API_KEY`
   - `EVOLUS_APPLICATION_ID`

### Docker Compose (Self-Hosted)

For self-hosted production deployment:

```bash
# Clone and configure
git clone https://github.com/TEAM-BSVJ/Shipment-Agent.git
cd Shipment-Agent
cp .env.example .env
# Edit .env with production credentials

# Deploy
docker compose up -d --build

# Verify
docker compose ps
curl http://your-server:3000/health
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add my feature"`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## Team

**TEAM-BSVJ** — Built for the AI-Powered Logistics Hackathon 2026

---

## License

This project is licensed under the MIT License.
