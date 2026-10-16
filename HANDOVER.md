īī# Comprehensive Handover Document: AI-Powered Logistics Bottleneck Resolution Agent

**Repository:** `TEAM-BSVJ/Shipment-Agent`  
**Active Working Branch:** `Jitesh@dev`  
**Working Directory:** `c:\Shipment-Agent`  
**Environment:** Python 3.12 (virtual environment at `./.venv/`), FastAPI, SQLAlchemy 2.0, Pydantic v2, APScheduler  
**Primary AI Model:** Google Gemma 4 31B Instruct (`gemma4 31B-it`) via Evolus AI Platform (`https://app.evolus.ai/`)  
**Current Test Suite:** **70 / 70 tests passing (100% pass rate)**  
**Latest Git Commit:** `95c2c2a` (`feat(seed): implement deterministic database seeder with 5 benchmark freight scenarios`)

---

## 1. Project Identity & Architecture Overview

The system is an **autonomous logistics bottleneck resolution agent** designed to:
1. Detect freight delays and documentation discrepancies across multimodal supply chains.
2. Formulate diagnostic root-cause analyses using **Google Gemma 4 31B Instruct** hosted on the **Evolus AI Platform**.
3. Execute policy-allowlisted remediation workflows with strict human-in-the-loop approval gates.
4. Record immutable audit logs for all events, agent inferences, and human decisions.

### Architectural Invariants & Rules (from `Rules.md` & `Architecture.md`)
- **RULE-C01 / DEC-006:** In-process **APScheduler** only. Absolutely NO external Redis, Celery, or RabbitMQ message brokers.
- **RULE-E03:** Strict maximum recursion limit of 5 tool calls per agent reasoning cycle.
- **RULE-F02:** Untrusted freight telemetry/data MUST be enclosed within `<user_data>...</user_data>` XML fences prior to LLM inference to prevent prompt injection.
- **RULE-F03:** External stakeholder notifications must use pre-approved parameterized templates; free-form generative LLM text is never sent directly.
- **RULE-F04 / NFR-009:** Multi-tenant isolation enforced. Standard demo tenant: `DEFAULT_TENANT_ID = uuid.UUID("a0000000-0000-0000-0000-000000000001")`.
- **RULE-F05:** Instant rejection of executable file uploads (`.exe`, `.sh`, `.bat`, `.cmd`, `.ps1`). Supported: PDF, PNG, JPEG $\le 10$ MB.
- **DEC-008:** Evolus AI credit budget strictly preserved ($\le 1200$ tokens per prompt, exponential backoff, deterministic offline mock fallback).

---

## 2. Complete Summary of Completed Work (Commits & Files)

### Milestone 1: Backend Foundation & FastAPI Core
- **`backend/requirements.txt` & `backend/pytest.ini`** (Commit `8a911a7`): Pinned FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0, asyncpg, APScheduler, pytest, httpx. Configured `asyncio_mode = auto`.
- **`backend/app/config.py` & `backend/tests/test_config.py`** (Commit `0aa950e`): Pydantic Settings v2 loading `.env` variables (`DATABASE_URL`, `EVOLUS_BASE_URL`, `EVOLUS_API_KEY`, `EVOLUS_APPLICATION_ID`, `EVOLUS_MODEL`, `DOCUMENT_STORAGE_DIR`, `CORS_ORIGINS`). (3 / 3 tests passing).
- **`backend/app/main.py` & `backend/tests/test_health.py`** (Commit `fd45315`): Application factory (`create_app()`), CORS middleware, async lifespan context manager, health endpoints (`GET /health`, `GET /`). (3 / 3 tests passing).

### Milestone 2: Domain Schemas, PostgreSQL ORM & Database Foundations
- **`backend/app/schemas/enums.py` & `domain.py` & `backend/tests/test_schemas.py`** (Commit `f94e7da`): Domain enums and Pydantic v2 contracts with strict boundaries for Shipments, Milestones, Documents, Events, Exceptions, Approvals, and LLM output (`AgentDiagnosticOutput`). (7 / 7 tests passing).
- **`backend/app/db/session.py` & `backend/app/models/base.py` & `backend/tests/test_db_session.py`** (Commit `0076863`): Async SQLAlchemy 2.0 engine, connection pool (`pool_size=10, max_overflow=20`), `get_db()` generator dependency, and declarative base with mixins (`UUIDPrimaryKeyMixin`, `TimestampMixin`, `TenantMixin`). (5 / 5 tests passing).
- **`backend/app/models/entities.py` & `backend/tests/test_models.py`** (Commit `dd53151`): All 9 relational ORM entities (`Shipment`, `ShipmentMilestone`, `ShipmentDocument`, `ShipmentEvent`, `ShipmentException`, `CorrectiveAction`, `Approval`, `Notification`, `AuditLog`) with foreign keys, cascading deletes, and composite indexes. (5 / 5 tests passing).

### Milestone 3: Allowlisted Tool Registry & Evolus AI Integration Service
- **`backend/app/tools/registry.py`, `handlers.py`, `__init__.py` & `backend/tests/test_tools.py`** (Commit `00eecad`): 6 allowlisted tools (`get_shipment`, `create_correction_task`, `trigger_workflow`, `send_notification`, `reschedule_milestone`, `escalate_to_human`), human-approval flags for consequential actions, parameterized notification templates, and 5-call hard recursion cutoff. (12 / 12 tests passing).
- **`backend/app/integrations/evolus_client.py` & `backend/tests/test_evolus_client.py`** (Commit `92147c4`): Client for Evolus AI Platform running `gemma4 31B-it` with dual-header auth (`X-ApiKey` + `X-Application-Id`), `<user_data>` prompt injection sanitization, token budget tracking ($\le 1200$ tokens), exponential retry, and offline mock fallback. (10 / 10 tests passing).

### Milestone 4: Document Intelligence & Background Monitoring Engine
- **`backend/app/document_processing/pipeline.py`, `validator.py`, `__init__.py` & `backend/tests/test_document_checks.py`** (Commit `4dc679e`): Secure file upload validation, regex field extraction into `DocumentExtractedFields`, and cross-document reconciliation between Commercial Invoice and Packing List (flags `WEIGHT_MISMATCH` if discrepancy $> 0.5$ kg, plus `CONSIGNEE_MISMATCH`). (11 / 11 tests passing).
- **`backend/app/monitoring/risk_scorer.py`, `scheduler.py`, `__init__.py` & `backend/tests/test_monitoring.py`** (Commit `66a602b`): Explainable risk score engine from Architecture.md Section 11.2:
  $$\text{RiskScore} = \min(100, \text{DelayPenalty} + \text{ExceptionWeight} + \text{DeadlineUrgency} + \text{PriorityWeight})$$
  with breakdown explanations and risk tiers (`LOW`: 0-30, `MEDIUM`: 31-60, `HIGH`: 61-80, `CRITICAL`: 81-100). In-process `AsyncIOScheduler` evaluates uncompleted milestones overdue by $\ge 2.0$ hours, creates `MILESTONE_OVERDUE` exceptions idempotently, logs audit events, and updates shipment risk scores. (11 / 11 tests passing).

### Milestone 5: Database Seeding, REST API & Central Orchestrator
- **`scripts/seed_db.py` & `backend/tests/test_seed_db.py`** (Commit `95c2c2a`): Deterministic database seeder generating 5 benchmark multi-tenant freight scenarios covering all 9 tables:
  1. `SHP-101` (Sea): Mumbai to Rotterdam — Missing Commercial Invoice (`MISSING_DOCUMENT`), pending document request action (`REQUEST_DOCUMENT`), email advisory sent.
  2. `SHP-102` (Air): Dallas to Austin — Overdue Warehouse Dispatch (+4.5h delay, `MILESTONE_OVERDUE`), pending rescheduling action (`RESCHEDULE_MILESTONE`), pending human approval.
  3. `SHP-103` (Sea): Shanghai to Los Angeles — Weight discrepancy (Invoice 250 kg vs Packing List 310 kg, $\Delta = 60$ kg, `WEIGHT_MISMATCH`), pending automation workflow (`TRIGGER_AUTOMATION`) with approval gate.
  4. `SHP-104` (Road): Detroit to Cleveland — Healthy on-schedule operating baseline, valid Bill of Lading, 0 open exceptions, Risk Score 0 (`LOW`).
  5. `SHP-105` (Air): Frankfurt to Chicago — Critical customs hold on cold-chain pharma shipment due today (`CUSTOMS_REJECTION`), completed broker escalation (`ESCALATE_TO_HUMAN`), approved human sign-off (`APPROVED`).
  (3 / 3 tests passing).

---

## 3. Test Suite Verification (70 / 70 Passing)

Run tests using forward slashes in MinGW64/Git Bash:
```powershell
./.venv/Scripts/pytest backend/tests/ -v
```

```text
backend/tests/test_config.py::test_default_settings_instantiation PASSED
backend/tests/test_config.py::test_environment_override PASSED
backend/tests/test_config.py::test_get_settings_cached PASSED
backend/tests/test_db_session.py::test_engine_configuration PASSED
backend/tests/test_db_session.py::test_sessionmaker_configuration PASSED
backend/tests/test_db_session.py::test_get_db_generator_signature PASSED
backend/tests/test_db_session.py::test_base_model_and_mixins PASSED
backend/tests/test_db_session.py::test_close_db_engine_executes_safely PASSED
backend/tests/test_document_checks.py::test_file_upload_validator_accepts_valid_files PASSED
backend/tests/test_document_checks.py::test_file_upload_validator_rejects_executable_extensions PASSED
backend/tests/test_document_checks.py::test_file_upload_validator_rejects_exceeding_file_size PASSED
backend/tests/test_document_checks.py::test_file_upload_validator_rejects_disallowed_mime PASSED
backend/tests/test_document_checks.py::test_document_parser_extracts_commercial_invoice_fields PASSED
backend/tests/test_document_checks.py::test_document_parser_extracts_packing_list_fields PASSED
backend/tests/test_document_checks.py::test_cross_document_weight_discrepancy_detection PASSED
backend/tests/test_document_checks.py::test_cross_document_weight_within_tolerance_passes PASSED
backend/tests/test_document_checks.py::test_cross_document_consignee_mismatch_detection PASSED
backend/tests/test_document_checks.py::test_check_missing_mandatory_documents PASSED
backend/tests/test_document_checks.py::test_save_uploaded_file_creates_file_on_disk PASSED
backend/tests/test_evolus_client.py::test_evolus_config_instantiation_from_settings PASSED
backend/tests/test_evolus_client.py::test_build_diagnostic_prompt_sanitization PASSED
backend/tests/test_evolus_client.py::test_mock_diagnosis_weight_mismatch PASSED
backend/tests/test_evolus_client.py::test_mock_diagnosis_milestone_overdue PASSED
backend/tests/test_evolus_client.py::test_mock_diagnosis_missing_document PASSED
backend/tests/test_evolus_client.py::test_live_inference_with_mock_transport PASSED
backend/tests/test_evolus_client.py::test_live_inference_retry_on_server_error PASSED
backend/tests/test_evolus_client.py::test_live_inference_exhausted_retries_raises_runtime_error PASSED
backend/tests/test_evolus_client.py::test_trigger_automation_mock_and_live PASSED
backend/tests/test_evolus_client.py::test_resume_automation_step_mock_and_live PASSED
backend/tests/test_health.py::test_health_check_returns_ok PASSED
backend/tests/test_health.py::test_root_endpoint_returns_metadata PASSED
backend/tests/test_health.py::test_cors_preflight_headers PASSED
backend/tests/test_models.py::test_metadata_contains_all_nine_tables PASSED
backend/tests/test_models.py::test_shipment_foreign_keys_and_relationships PASSED
backend/tests/test_models.py::test_corrective_action_and_approval_relationship PASSED
backend/tests/test_models.py::test_index_definitions PASSED
backend/tests/test_models.py::test_model_column_defaults_and_instantiation PASSED
backend/tests/test_monitoring.py::test_risk_scorer_baseline_on_time PASSED
backend/tests/test_monitoring.py::test_risk_scorer_delay_penalty_scaling PASSED
backend/tests/test_monitoring.py::test_risk_scorer_exception_weight PASSED
backend/tests/test_monitoring.py::test_risk_scorer_deadline_urgency PASSED
backend/tests/test_monitoring.py::test_risk_scorer_priority_weight PASSED
backend/tests/test_monitoring.py::test_risk_scorer_caps_at_100_and_critical PASSED
backend/tests/test_monitoring.py::test_risk_scorer_tier_thresholds PASSED
backend/tests/test_monitoring.py::test_milestone_checker_flags_overdue_milestone PASSED
backend/tests/test_monitoring.py::test_milestone_checker_idempotency_prevents_duplicates PASSED
backend/tests/test_monitoring.py::test_milestone_checker_ignores_on_time_and_completed PASSED
backend/tests/test_monitoring.py::test_monitoring_scheduler_lifecycle PASSED
backend/tests/test_schemas.py::test_shipment_create_and_response PASSED
backend/tests/test_schemas.py::test_shipment_invalid_tracking PASSED
backend/tests/test_schemas.py::test_milestone_schemas PASSED
backend/tests/test_document_extraction_bounds PASSED
backend/tests/test_exception_schemas PASSED
backend/tests/test_agent_diagnostic_output_parsing PASSED
backend/tests/test_approval_decision_validation PASSED
backend/tests/test_seed_db.py::test_build_seed_entities_scenarios PASSED
backend/tests/test_seed_db.py::test_seed_database_execution_mock PASSED
backend/tests/test_seed_db.py::test_seed_database_execution_no_reset PASSED
backend/tests/test_tools.py::test_registry_contains_exactly_six_allowlisted_tools PASSED
backend/tests/test_tools.py::test_unknown_tool_rejection PASSED
backend/tests/test_tools.py::test_approval_flags_match_specification PASSED
backend/tests/test_tools.py::test_tool_argument_validation PASSED
backend/tests/test_tools.py::test_hard_recursion_limit_enforced PASSED
backend/tests/test_tools.py::test_execute_get_shipment PASSED
backend/tests/test_tools.py::test_execute_create_correction_task PASSED
backend/tests/test_tools.py::test_execute_trigger_workflow_approval_gate PASSED
backend/tests/test_tools.py::test_execute_reschedule_milestone_approval_gate PASSED
backend/tests/test_tools.py::test_execute_send_notification_template PASSED
backend/tests/test_tools.py::test_execute_escalate_to_human PASSED
backend/tests/test_tools.py::test_tool_schemas_export_for_llm PASSED
============================= 70 passed in 2.07s ==============================
```

---

## 4. Next Units to Implement (Execution Blueprint)

### Unit 5.2: REST API Routers & Service Layer (`TASK-013`, `TASK-014`, `TASK-026`, `TASK-027`, `TASK-028`)
1. **Shipment Router & Service (`backend/app/api/v1/shipments.py`, `backend/app/services/shipment_service.py`):**
   - `GET /api/v1/shipments`: Filter by `status`, `business_priority`, `risk_level`, `mode` with pagination.
   - `GET /api/v1/shipments/{id}`: Detailed relational response (ordered milestones, documents, active exceptions, notifications).
   - `POST /api/v1/shipments`: Create new shipment with initial milestones.
2. **Event Ingestion Router (`backend/app/api/v1/events.py`):**
   - `POST /api/v1/shipments/{id}/events`: Idempotent carrier/warehouse telemetry ingestion (`idempotency_key` check). Advances milestone completion when applicable.
3. **Document Router (`backend/app/api/v1/documents.py`):**
   - `POST /api/v1/documents/upload`: Secure file upload using `DocumentPipeline.validate_upload` and disk storage.
   - `POST /api/v1/documents/{id}/extract`: Triggers document extraction pipeline and cross-document reconciliation.
4. **Exceptions & Approvals Routers (`backend/app/api/v1/exceptions.py`, `backend/app/api/v1/approvals.py`):**
   - `GET /api/v1/exceptions`: Prioritized list of active exceptions sorted by risk severity.
   - `GET /api/v1/approvals`: List pending approval requests (`PENDING`).
   - `POST /api/v1/approvals/{id}/decide`: Process human decision (`APPROVED` or `REJECTED`) with audit logging.
5. **Audit Router (`backend/app/api/v1/audit.py`):**
   - `GET /api/v1/audit`: Query chronological immutable audit trail.
6. **FastAPI Main Integration (`backend/app/main.py`):**
   - Mount API v1 router prefix (`/api/v1`).
7. **Comprehensive Async API Test Suite (`backend/tests/test_api_v1.py`):**
   - HTTP tests for all endpoints validating status codes, validation boundaries, and response schemas.

### Unit 5.3: Central Agent Orchestrator & Reasoning Loop (`TASK-022`, `TASK-023`)
- `backend/app/agents/orchestrator.py`: ReAct loop with max 5 iterations, prompt injection sanitization `<user_data>`, structured `AgentDiagnosticOutput` generation, allowlisted tool calling, approval gating, and audit logging.
- `backend/app/api/v1/agent.py`: `POST /api/v1/agent/analyze` and `POST /api/v1/agent/chat`.
- `backend/tests/test_orchestrator.py`: Unit tests for orchestrator.

### Milestone 6: React + Vite Frontend Dashboard
- Scaffold React 18 SPA in `frontend/` (Vite, TypeScript, Tailwind CSS, Lucide React).
- Components: `Navbar`, `Sidebar`, `MetricsRow`, `ShipmentTable`, `MilestoneTimeline`, `DocumentPanel`, `ApprovalCard`, `ReasonModal`, `ChatDrawer`.
- Services: `api.ts`, `shipmentService.ts`, `exceptionService.ts`, `approvalService.ts`, `agentService.ts`.

---

## 5. Critical Operating Gotchas & Instructions for Incoming AI Agent

1. **Git Policy:**
   - **Branch:** Strictly stay on `Jitesh@dev`.
   - **Commit approval:** Never commit without explicit user approval.
   - **Staging:** Stage only explicit file paths (`git add backend/...`). Never `git add .` to avoid exposing `.env` or untracked scratch files.
   - **Post-checkpoint rule:** Always state what you will do next when reporting progress and asking for approval.
2. **Terminal Shell Formatting:**
   - Running in Windows MinGW64 / Git Bash. Always use forward slashes in commands (e.g. `./.venv/Scripts/pytest backend/tests/ -v`).
3. **ORM Entity Nuances:**
   - Only `Shipment` inherits `TenantMixin`. Do not pass `tenant_id` to milestones, documents, exceptions, or approvals.
   - `ShipmentMilestone` uses attribute `milestone_name` (not `name`), and `is_completed: bool`, `completed_at: Optional[datetime]`.
   - `ShipmentException` uses attribute `exception_type` (not `type`) and `risk_level` (not `severity`).
   - `CorrectiveAction` columns: `action_type`, `status`, `tool_used`, `input_data`, `output_data`, `idempotency_key`, `executed_at`. (Do not pass `description` or `parameters` as top-level kwargs; store them inside `input_data`).
   - `DocumentValidationStatus` enum values: `PENDING`, `VALIDATED`, `FLAGGED`, `REJECTED`.
   - `ActionStatus` enum values: `PENDING`, `WAITING_APPROVAL`, `EXECUTING`, `COMPLETED`, `FAILED`, `REJECTED`.

