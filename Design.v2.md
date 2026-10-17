# UI/UX Design Specification v2.0
## AETHERIS Freight Command — AI-Powered Logistics Bottleneck Resolution Platform

> **Document Version:** 2.0.0  
> **Status:** Production Design Specification / Implementation-Ready  
> **Target Release:** Milestone 6 Frontend Implementation  
> **Project Repository:** `logistics-agent` (`c:\Shipment-Agent`)  
> **Related Documents:** [Architecture.md](Architecture.md) | [PRD.md](PRD.md) | [Rules.md](Rules.md) | [Memory.md](Memory.md) | [Tasks.md](Tasks.md) | [evolusworkflow.md](evolusworkflow.md)

---

## 1. Executive Summary & Design Vision

### 1.1 Document Purpose
This document provides the definitive UI/UX design architecture, component specifications, interaction design rules, design tokens, and frontend implementation guidelines for the **AETHERIS Freight Command** platform. It supersedes the baseline `Design.md` specification, transitioning the application from a generic administrative dashboard into a high-density, mission-critical logistics operations command center.

This specification is complete, self-contained, and implementation-ready. A frontend software engineer or coding agent can construct the entire client application directly from this document without needing to make arbitrary aesthetic or structural decisions.

### 1.2 Product Vision & Problem Space
Global freight logistics operations are plagued by fragmented communication, opaque carrier portals, delayed customs declarations, and milestone blind spots. Operators routinely handle dozens of high-value shipments simultaneously across road, sea, air, and rail. Delays are often detected only after cargo has physically missed a vessel cutoff or incurred expensive demurrage fees.

**AETHERIS Freight Command** bridges this operational gap by continuously monitoring milestone telemetry, identifying documentation inconsistencies, diagnosing bottleneck root causes using **Google Gemma 4 (31B-it)** via the **Evolus AI Platform**, and driving resolution through human-governed automation workflows.

### 1.3 Design Archetype: Futuristic Operations Command Center
The visual language draws inspiration from modern aerospace telemetry hubs, maritime fleet traffic control, and advanced cybersecurity defense consoles. It replaces bright, low-contrast office dashboard styles with an immersive, low-fatigue, high-contrast dark environment engineered for rapid cognitive triage in 24/7 operations rooms.

Key characteristics:
- **Cinematic & Tactical:** Deep slate-navy surfaces (`#080D18`, `#101B2B`) punctuated by high-signal electric cyan (`#38D9FF`), operational mint (`#36E0B0`), caution amber (`#FFB547`), critical coral (`#FF5D73`), and cognitive violet (`#B9A0FF`).
- **Data-Dense & Monospaced:** Monospaced data displays (`JetBrains Mono`) for tracking IDs, timestamps, container codes, weights, and lat/long coordinates with tabular numeral alignment.
- **Subtle Visual Feedback:** Micro-glows, directional route pulses, and state badges that communicate actual system activity without gratuitous sci-fi tropes or neon distractions.
- **Honest Operational Feedback:** Never fabricates live telemetry or synthetic responses; clearly separates verified backend states from simulated hackathon mock data.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AETHERIS FREIGHT COMMAND — SYSTEM STATUS: OPTIMAL [SYS-LIVE]  UTC 14:42:10            │
├──────────────┬───────────────────────────────────────────────────────────┬─────────────┤
│ NAV RAIL     │ GLOBAL SITUATIONAL MAP (HERO TELEMETRY)                   │ COPILOT     │
│ [Command]    │ ┌───────────────────────────────────────────────────────┐ │ [AI DRAWER] │
│ [Explorer]   │ │  Route SHP-101 (SEA): HKG -> LAX [DISCREPANCY ALERT]  │ │ Active      │
│ [Exceptions] │ │  Route SHP-102 (ROAD): ORD -> DFW [OVERDUE +4.2h]     │ │ Session     │
│ [Validation] │ └───────────────────────────────────────────────────────┘ │ Reasoning   │
│ [Approvals]  ├───────────────────────────────────────────────────────────┤ & Evidence  │
│ [Audit Log]  │ ACTIVE BOTTLENECK TRIAGE & INTERACTIVE TIMELINE           │ Inspector   │
└──────────────┴───────────────────────────────────────────────────────────┴─────────────┘
```

---

## 2. Core Design Principles

1. **Map-First Situational Awareness:** The global geographic state of active freight movements is visible within seconds of loading the platform. Operators see geographic clusters, at-risk lanes, and port congestion before drilling into individual tables.
2. **Exceptions Before Decoration:** Critical delays, customs holds, and missing paperwork take visual precedence over nominal operations. A critical shipment commands immediate attention via high-contrast coral badges and animated alert pulses.
3. **Evidence-Backed Intelligence:** No AI diagnosis is presented without concrete provenance. Every recommendation surfaces primary evidence: exact document mismatches, timestamps, delay deltas, and confidence scores.
4. **Action-Oriented Workflows:** Every bottleneck or exception screen features a single obvious, accessible primary next step (e.g., "Request Invoice", "Approve Reschedule", "Escalate to Lead").
5. **Human Governance & Friction Where It Matters:** Safe read actions and non-destructive notifications execute seamlessly. High-consequence actions (rescheduling cutoffs, rerouting, cancelling tasks) require explicit confirmation dialogs with required operator reasoning.
6. **Operational Credibility & Zero Hallucination:** The UI strictly reflects verified database states. Where data is simulated via mock adapters, an unobtrusive "Simulated Telemetry" badge is displayed.
7. **Performance-Conscious Animation:** Visual effects (route pulses, radar sweeps) are hardware-accelerated, capped at low CPU consumption, and automatically disabled when `prefers-reduced-motion` is detected.

---

## 3. Design System & Tokens

### 3.1 Color Palette & Semantic Mapping
The design system enforces a strict dark palette. Colors are never applied arbitrarily; each token serves a specific cognitive function.

```
Backgrounds & Surfaces:
  Main Background:    #080D18   (Deep space navy; global app canvas)
  Primary Surface:    #101B2B   (Card containers, sidebar, top bar)
  Elevated Surface:   #142235   (Modals, popovers, active selection cards)
  Secondary Surface:  #18283A   (Nested panels, table headers, code blocks)
  Border / Dividers:  #25364B   (1px subtle structural borders)
  Border Highlight:   #334A66   (Hovered/focused element borders)

Typography Tokens:
  Primary Text:       #E7EEF8   (Headings, high-emphasis values, titles)
  Secondary Text:     #9DAEC3   (Labels, body descriptions, table headers)
  Muted Text:         #73859C   (Timestamps, helper hints, breadcrumbs)
  Disabled Text:      #4A5A6E   (Inactive controls, disabled actions)

Functional Accents:
  Electric Cyan:      #38D9FF   (Primary navigation, active routes, focus rings, primary CTA)
  Operational Mint:   #36E0B0   (Healthy milestones, resolved bottlenecks, success states)
  Caution Amber:      #FFB547   (Medium risk 31-60, warning thresholds, upcoming cutoffs)
  Critical Coral:     #FF5D73   (High/Critical risk >60, overdue milestones, weight discrepancies)
  Cognitive Violet:   #B9A0FF   (AI agent reasoning, Evolus AI indicators, LLM diagnostic output)
```

#### Detailed Semantic Palette Specifications

| Token Name | Hex Code | Tailwind Token | Allowed Usage & Constraints |
|---|---|---|---|
| `bg-app-main` | `#080D18` | `bg-[#080D18]` | Root viewport background, canvas backdrop. Never used on interactive buttons. |
| `surface-primary` | `#101B2B` | `bg-[#101B2B]` | Standard card backgrounds, navigation rail, top header bar. |
| `surface-elevated`| `#142235` | `bg-[#142235]` | Drawers, dialog modals, dropdown menus, hovered cards. |
| `surface-secondary`| `#18283A`| `bg-[#18283A]` | Inner sub-panels, table header rows, timeline node backgrounds. |
| `border-subtle` | `#25364B` | `border-[#25364B]` | Standard 1px structural dividing lines across all components. |
| `border-glow` | `#334A66` | `border-[#334A66]` | Focused input borders, active card borders, hover borders. |
| `text-primary` | `#E7EEF8` | `text-[#E7EEF8]` | Page titles, primary numbers, tracking IDs, critical alerts. |
| `text-secondary` | `#9DAEC3` | `text-[#9DAEC3]` | Form labels, standard paragraph descriptions, secondary values. |
| `text-muted` | `#73859C` | `text-[#73859C]` | Metadata tags, timestamp labels, table column titles. |
| `accent-cyan` | `#38D9FF` | `text-[#38D9FF]` / `bg-[#38D9FF]` | Active navigation pills, normal route polyline, primary buttons, focus rings. |
| `accent-mint` | `#36E0B0` | `text-[#36E0B0]` / `bg-[#36E0B0]` | Low risk (0-30), completed milestones, verified documents, healthy state. |
| `accent-amber` | `#FFB547` | `text-[#FFB547]` / `bg-[#FFB547]` | Medium risk (31-60), approaching cutoffs (<24h), pending review. |
| `accent-coral` | `#FF5D73` | `text-[#FF5D73]` / `bg-[#FF5D73]` | High/Critical risk (>60), overdue milestones, validation failure, exceptions. |
| `accent-violet` | `#B9A0FF` | `text-[#B9A0FF]` / `bg-[#B9A0FF]` | Gemma 4 31B-it copilot bubbles, AI diagnostic badges, automation steps. |

#### Accent Color Strict Usage Rules
- **Electric Cyan (`#38D9FF`)**: Restricted to interactive focus, primary actions, active navigation links, and nominal in-transit route vectors. Do not use for status alerts.
- **Operational Mint (`#36E0B0`)**: Restricted to positive operational events (e.g. `DELIVERED`, document `VALID`, risk `LOW`, milestone `COMPLETED`).
- **Caution Amber (`#FFB547`)**: Restricted to warning states requiring attention but not immediately blocking cargo (e.g. `MEDIUM RISK`, milestone overdue $< 4\text{ hours}$, document pending review).
- **Critical Coral (`#FF5D73`)**: Restricted to active operational bottlenecks (e.g. `CUSTOMS_HOLD`, `WEIGHT_MISMATCH`, overdue $> 4\text{ hours}$, risk $\ge 61$).
- **Cognitive Violet (`#B9A0FF`)**: Exclusively reserved for AI-assisted capabilities (Evolus AI copilot, Gemma reasoning highlights, auto-extracted confidence scores).

### 3.2 Typography System

The interface uses two primary typeface families:
1. **Primary Interface:** `Inter`, `system-ui`, `-apple-system`, `sans-serif` — Engineered for crisp micro-legibility at 12px–14px on high-DPI and standard display monitors.
2. **Technical Data & Monospace:** `JetBrains Mono`, `Fira Code`, `ui-monospace`, `monospace` — Used for tracking numbers (`SHP-101`), dates/timestamps (`2026-10-17 14:30 UTC`), container numbers (`MSKU-928174-2`), coordinates, weights, and UUIDs.

#### Type Scale & Hierarchy

| Token | Size | Line Height | Weight | Letter Spacing | Font Family | Typical Usage |
|---|---|---|---|---|---|---|
| `display-2xl` | 28px (`1.75rem`) | 36px | Bold (700) | `-0.02em` | `Inter` | Global Command Center title, major KPI numbers |
| `heading-xl` | 22px (`1.375rem`)| 28px | SemiBold (600) | `-0.015em`| `Inter` | Main page view headers, modal titles |
| `heading-lg` | 18px (`1.125rem`)| 24px | SemiBold (600) | `-0.01em` | `Inter` | Card section titles, map drawer headers |
| `heading-md` | 15px (`0.9375rem`)| 20px| Medium (500) | `0em` | `Inter` | Table column groups, panel subheadings |
| `body-base` | 14px (`0.875rem`) | 20px | Regular (400) | `0em` | `Inter` | General descriptions, AI diagnostic explanations |
| `body-medium`| 14px (`0.875rem`) | 20px | Medium (500) | `0em` | `Inter` | Form labels, table cells, button text |
| `caption-sm` | 12px (`0.75rem`) | 16px | Regular (400) | `+0.01em` | `Inter` | Metadata tags, tooltips, helper text |
| `caption-xs` | 11px (`0.6875rem`)| 14px| Medium (500) | `+0.02em` | `Inter` | Status badge text, micro-labels, keyboard pills |
| `mono-lg` | 16px (`1.0rem`) | 22px | Medium (500) | `+0.02em` | `JetBrains Mono` | Hero shipment tracking IDs, risk percentages |
| `mono-base` | 13px (`0.8125rem`)| 18px| Regular (400) | `+0.01em` | `JetBrains Mono` | Table tracking numbers, weight values, container IDs |
| `mono-sm` | 12px (`0.75rem`) | 16px | Medium (500) | `0em` | `JetBrains Mono` | Timestamps, delay delta indicators (`+4.2h`), coordinates |

*Numerical Rule:* All numerical values in tables, timelines, and metric counters MUST employ tabular figures via `font-variant-numeric: tabular-nums` to eliminate layout jitter during live updates.

### 3.3 Spacing, Borders, Radii, and Shadows

- **Spacing Base Grid:** 4px baseline (`p-1` = 4px, `p-2` = 8px, `p-3` = 12px, `p-4` = 16px, `p-6` = 24px, `p-8` = 32px).
- **Border Radii:**
  - `rounded-sm`: 4px (Buttons, badges, tags, input fields)
  - `rounded-md`: 6px (Standard cards, dropdown menus, table containers)
  - `rounded-lg`: 10px (Modals, map panels, slide-over copilot drawer)
  - `rounded-full`: 9999px (Status indicator dots, avatar pills)
- **Border System:**
  - Standard container: `border border-[#25364B]`
  - Highlighted / Focused: `border border-[#38D9FF]` with `ring-1 ring-[#38D9FF]/30`
  - Critical exception: `border border-[#FF5D73]/60` with `shadow-[0_0_12px_rgba(255,93,115,0.15)]`
  - AI reasoning card: `border border-[#B9A0FF]/40` with `shadow-[0_0_15px_rgba(185,160,255,0.1)]`
- **Elevation & Depth:**
  - Level 0 (Canvas): Background `#080D18`, no shadow.
  - Level 1 (Card): `#101B2B`, `box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.4)`.
  - Level 2 (Elevated Panel): `#142235`, `box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.6)`.
  - Level 3 (Modal / Drawer): `#18283A`, `box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(37, 54, 75, 0.5)`.

---

## 4. Global Application Shell & Navigation

### 4.1 Shell Architecture Decision
After evaluating pure top-navigation versus pure left-rail layouts, AETHERIS adopts a **Hybrid Hybrid Command Shell**:
- **Fixed Top Telemetry Bar (56px height):** Displays global system status, clock telemetry, live worker health, credit quota, global search (`Cmd+K`), and quick action shortcuts.
- **Collapsible Left Command Rail (64px collapsed, 220px expanded):** Hosts primary domain navigation icons and labels. Stays docked on the left to maximize vertical viewport space for tables and map visualizations.
- **Dynamic Viewport (Remaining screen space):** Hosts active view components with zero page reloads.
- **Dockable Right AI Copilot Drawer (380px width, slide-over / dockable):** Can be summoned globally via `Cmd+J` or contextual "Analyze with Agent" triggers.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] AETHERIS FREIGHT COMMAND  │  [LIVE 5m Heartbeat]  │  [Evolus AI: 48,250 Crd]  │ [14:42 UTC]   │
├─────────┬─────────────────────────────────────────────────────────────────────────────┬───────────────┤
│ [=] EXP │ BREADCRUMB: Command Center > Exceptions > SHP-101                           │ [AI COPILOT]  │
│ ─────── │ ─────────────────────────────────────────────────────────────────────────── │ ───────────── │
│ [MAP]   │                                                                             │ Agent Active  │
│ Command │                                                                             │ Gemma 4 31B-it│
│         │                                                                             │               │
│ [BOX]   │                                                                             │ "Diagnosing   │
│ Shipmnt │                         MAIN OPERATIONAL VIEWPORT                           │  weight       │
│         │                                                                             │  mismatch for │
│ [ALERT] │                                                                             │  SHP-103..."  │
│ Exceptn │                                                                             │               │
│         │                                                                             │ [Evidence #1] │
│ [DOCS]  │                                                                             │ [Evidence #2] │
│ Validtn │                                                                             │               │
│         │                                                                             │ [Execute Rec] │
│ [CHECK] │                                                                             │               │
│ Apprvls │                                                                             │               │
│         │                                                                             │               │
│ [HIST]  │                                                                             │               │
│ Audit   │                                                                             │               │
│         │                                                                             │               │
│ [GEAR]  │                                                                             │               │
│ Config  │                                                                             │               │
└─────────┴─────────────────────────────────────────────────────────────────────────────┴───────────────┘
```

### 4.2 Top Telemetry Bar Components
1. **Brand Identity:** A geometric vector icon (stylized navigation compass / route node in `#38D9FF`) + bold title `AETHERIS` + subtitle `COMMAND`.
2. **System Health Status Pill:**
   - Active / Nominal: Pulsing green dot + `HEALTHY [APScheduler 5m]`
   - Degraded / Warning: Amber dot + `DEGRADED [Evolus Fallback Active]`
   - Critical / Disconnected: Red dot + `DISCONNECTED [PostgreSQL Retrying]`
3. **Dual Global Clock:** Monospaced display showing `UTC 14:42:15` alongside local operations time `EST 09:42:15`.
4. **Platform Quota Gauge:** Shows current Evolus platform credits (e.g. `48,250 / 50,000 Credits` with a compact progress bar).
5. **Global Search Input (`Cmd+K`):** Monospaced placeholder `"Search tracking #, container, port, carrier... (Cmd+K)"`.
6. **Active Triage Pill:** Direct counter displaying `3 Exceptions Pending` in `#FF5D73`. Clicking scrolls directly to the triage queue.
7. **Copilot Toggle Button:** Violet icon button (`Sparkles` / `BrainCircuit`) displaying `Copilot (Cmd+J)`.

### 4.3 Left Command Rail Navigation Items

| Icon | Route | Label | Shortcut | Purpose |
|---|---|---|---|---|
| `LayoutDashboard` | `/dashboard` | **Command Center** | `G D` | Unified global map, critical KPIs, active bottleneck feed |
| `Package` | `/shipments` | **Shipment Explorer** | `G S` | Searchable tabular registry of all domestic and international shipments |
| `AlertTriangle` | `/exceptions` | **Exception Center** | `G E` | Dedicated bottleneck resolution queue sorted by risk score |
| `FileCheck2` | `/documents` | **Document Validation** | `G V` | Paperwork verification, OCR preview, cross-document reconciliation |
| `ShieldCheck` | `/approvals` | **Approvals Queue** | `G A` | Human-in-the-loop authorization gateway for agent actions |
| `TrendingUp` | `/analytics` | **Operational Trends** | `G T` | Bottleneck frequency, carrier delay metrics, SLA compliance |
| `History` | `/audit` | **Compliance Audit** | `G L` | Immutable chronological ledger of all events, model outputs, and actions |
| `Settings` | `/settings` | **System Config** | `G C` | Tenant settings, integration status, seed simulation tools |

---

## 5. Signature Feature: Global Logistics Command Map

### 5.1 Technology & Map Architecture
The world map is the signature visual feature of the Command Center, providing operators with immediate spatial comprehension of global transit vectors.

- **Primary Mapping Engine:** **MapLibre GL JS** (v4.x) utilizing vector tiles.
- **Basemap Styling:** A custom dark, low-contrast vector style with:
  - Deep space water bodies (`#080D18`)
  - Dark slate continental landmass (`#101B2B`)
  - Subtle international boundary lines (`#25364B`, 0.75px)
  - Zero commercial clutter, retail labels, or bright road networks.
- **Fallback Mode:** For offline environments or low-power workstations, an interactive SVG-based orthographic projection map renders identical route coordinates, nodes, and statuses without WebGL requirements.
- **Simulation Tag:** Because live AIS/GPS carrier feeds are simulated in the hackathon MVP, the map displays a restrained top-right pill: `"CARRIER TELEMETRY: SIMULATED (DETERMINISTIC)"`.

### 5.2 Route Polyline Visual Treatments
Active shipment vectors are represented as geodesic arc curves connecting origin, intermediate milestone nodes, and final destination:

1. **Normal Movement (Nominal):**
   - Line: Semi-transparent electric cyan (`#38D9FF`, width 2px, opacity 0.55).
   - Motion Pulse: A single bright cyan dot (`#38D9FF`, radius 3px) travels smoothly along the polyline path based on elapsed milestone transit time.
2. **At-Risk Movement (Medium Risk, 31–60):**
   - Line: Amber dashed line (`#FFB547`, dasharray `[4, 4]`, width 2.5px).
   - Motion: Slower pulsing alert indicator at current milestone node.
3. **Critical Bottleneck (High/Critical Risk, $\ge 61$):**
   - Line: Solid critical coral (`#FF5D73`, width 3px).
   - Motion: Concentric coral ripple wave radiating outward from the delayed facility or port node (e.g. Los Angeles Port or Chicago Warehouse).
4. **Selected Route State:**
   - When clicked, all other routes dim to 15% opacity; the selected route thickens to 4px with a subtle cyan/coral outer glow (`box-shadow: 0 0 10px rgba(56,217,255,0.4)`).

### 5.3 Interactive Node Markers

| Node Type | Icon / Visual Primitive | Color Token | Active Data Tooltip |
|---|---|---|---|
| **Maritime Port** | Anchor inside circular node | `#38D9FF` (Normal) / `#FF5D73` (Hold) | Port name, terminal code, container cutoff deadline, dwell time |
| **Airport Hub** | Plane takeoff inside diamond node | `#38D9FF` (Normal) / `#FFB547` (Delay)| IATA code, flight cutoff, customs staging queue status |
| **Warehouse / DC** | Hexagon with warehouse rack icon | `#36E0B0` (Dispatched) / `#FF5D73` (Stalled)| Facility ID, dock door #, scheduled vs actual dispatch timestamp |
| **Customs Post** | Shield with border line | `#FF5D73` (Hold) / `#36E0B0` (Cleared) | Checkpoint ID, regulatory agency, hold reason (e.g. Weight Mismatch) |

### 5.4 Map Camera Transitions & Controls
- **Camera FlyTo:** Selecting a shipment from the triage feed triggers a smooth camera flyTo (`duration: 1200ms`, easing curve `cubic-bezier(0.25, 1, 0.5, 1)`) centering on the active bottleneck node with an optimal bounding box encompassing the entire origin-to-destination vector.
- **Floating Controls (HUD):**
  - Mode Filter: Toggle pills (`ALL`, `SEA`, `AIR`, `ROAD`, `RAIL`).
  - Risk Filter: Toggle pills (`ALL`, `CRITICAL ONLY`, `EXCEPTIONS`).
  - Zoom & Compass: Minimalist vertical pill in bottom-right (`+`, `-`, `Reset View`).
- **Accessible Fallback:** An immediate shortcut button `View Tabular Grid` allows screen-reader users and keyboard-only operators to toggle between the 2D spatial map and a structured geographic data table.

---

## 6. Comprehensive Screen Specifications

### Screen 1: Command Center (Executive Operations Dashboard)
- **Route:** `/` or `/dashboard`
- **Purpose:** Primary situational overview for logistics leads and dispatchers. Surfaces active geographic transit, high-level fleet KPIs, and the immediate bottleneck triage feed.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [KPI 1: ACTIVE SHIPMENTS] │ [KPI 2: BOTTLENECKS] │ [KPI 3: PENDING APPROVALS] │ [KPI 4]│
│  42 Total (34 In-Transit) │  3 Critical Exceptions│  2 Awaiting Human Sign-Off │ SLA:94%│
├───────────────────────────────────────────────────────┬────────────────────────────────┤
│ GLOBAL COMMAND MAP (HERO)                             │ BOTTLENECK TRIAGE QUEUE (LIVE) │
│                                                       │ ┌────────────────────────────┐ │
│  [MapLibre GL Container with Dark Vector Styling]     │ │ CRITICAL: SHP-101 (SEA)    │ │
│  - Active Geo Vectors (Cyan / Amber / Coral)          │ │ Missing Commercial Invoice │ │
│  - Interactive Port/Warehouse Nodes                   │ │ Cutoff in 6h | Risk: 85    │ │
│  - Floating Map Mode Filters: [ALL] [SEA] [AIR] [ROAD]│ ├────────────────────────────┤ │
│                                                       │ │ HIGH: SHP-103 (AIR)        │ │
│                                                       │ │ Weight Mismatch (60kg)     │ │
│                                                       │ │ Risk: 72 | Doc Review Req  │ │
│                                                       │ ├────────────────────────────┤ │
│                                                       │ │ HIGH: SHP-102 (ROAD)       │ │
│                                                       │ │ Warehouse Dispatch Overdue │ │
│                                                       │ │ Overdue: +4.2h | Risk: 68  │ │
├───────────────────────────────────────────────────────┴─┴────────────────────────────┤
│ QUICK ACTIONS BAR: [Trigger Health Scan]  [Simulate Event]  [Export Shift Report]      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Element Specifications
1. **Top KPI Telemetry Row (4 Cards):**
   - Card 1: **Active Shipments:** `42` total. Subtext: `34 on schedule, 8 flagged`. Sparkline showing 24h active volume.
   - Card 2: **Critical Bottlenecks:** `3` in high-urgency coral (`#FF5D73`). Subtext: `2 Document, 1 Milestone Delay`.
   - Card 3: **Pending Approvals:** `2` in amber (`#FFB547`). Subtext: `Actions awaiting operations lead sign-off`.
   - Card 4: **On-Time Delivery SLA:** `94.2%`. Mint indicator (`#36E0B0`) with target marker `95.0%`.
2. **Hero Map Panel (Left 65% width):** Interactive MapLibre GL container as specified in Section 5.
3. **Bottleneck Triage Feed (Right 35% width):** Real-time list of shipments with active exceptions sorted descending by risk score (`SHP-101`, `SHP-103`, `SHP-102`). Each card shows:
   - Tracking ID + Transport Mode badge (`SEA`, `AIR`, `ROAD`).
   - Exception type pill (`MISSING_DOCUMENT`, `WEIGHT_MISMATCH`, `MILESTONE_OVERDUE`).
   - Risk score dial (e.g. `85` in coral ring).
   - Evidence snippet (e.g., `"Commercial Invoice missing 6h prior to container cutoff"`).
   - Direct action button: `"Triage Now"` (navigates to detail or triggers copilot).
4. **State Handling:**
   - *Loading:* Pulse-animated dark skeleton cards on KPI counters and map overlay.
   - *Empty:* Centered radar sweep graphic with text: `"No active bottlenecks detected across fleet. All 42 shipments operating within planned milestone tolerances."`
   - *Error:* Inline coral banner: `"Telemetry connection lost. Displaying cached state from 14:38:00 UTC."` with a `Retry` trigger.

---

### Screen 2: Shipment Explorer (Fleet & Cargo Registry)
- **Route:** `/shipments`
- **Purpose:** Searchable, filterable tabular registry allowing operators to inspect, sort, and batch-query any shipment in the system.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SHIPMENT EXPLORER                                    [Export CSV]  [+ Register Manual] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ FILTERS: [Search Input...] │ Mode: [All v] │ Status: [All v] │ Risk: [All v] │ [Reset] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ ] TRACKING # │ MODE │ ORIGIN -> DEST │ CARRIER │ CUTOFF / SLA │ RISK │ STATUS │ ACTION│
│ ───────────────────────────────────────────────────────────────────────────────────────│
│ [ ] SHP-101    │ SEA  │ HKG -> LAX     │ MAERSK  │ Oct 18 18:00 │  85  │ EXCPTN │ Triage│
│ [ ] SHP-102    │ ROAD │ ORD -> DFW     │ SWIFT   │ Oct 17 10:00 │  68  │ OVERDUE│ Review│
│ [ ] SHP-103    │ AIR  │ PVG -> FRA     │ LUFTH   │ Oct 19 12:00 │  72  │ HOLD   │ Diff  │
│ [ ] SHP-104    │ ROAD │ ATL -> CLT     │ FEDEX   │ Oct 17 22:00 │  12  │ TRANSIT│ View  │
│ [ ] SHP-105    │ SEA  │ SIN -> RTM     │ CMA-CGM │ Oct 21 08:00 │  35  │ BOOKED │ View  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Showing 1-5 of 42 Shipments                      [<< First] [< Prev] [1] [2] [Next >]  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Table Specifications
- **Multi-Dimensional Filters:**
  - Full-text search (matches Tracking Number, Carrier ID, Consignee, Origin Port, Destination City).
  - Mode dropdown: `All`, `SEA`, `AIR`, `ROAD`, `RAIL`.
  - Status dropdown: `BOOKED`, `PICKED_UP`, `IN_TRANSIT`, `AT_WAREHOUSE`, `CUSTOMS_HOLD`, `DELIVERED`, `EXCEPTION`.
  - Risk slider / dropdown: `All`, `Low (0-30)`, `Medium (31-60)`, `High (61-80)`, `Critical (81-100)`.
- **Columns & Cell Formatting:**
  - `Tracking #`: Monospaced bold (`SHP-101`), clickable link to `/shipments/SHP-101`.
  - `Mode`: Badge with transport mode icon (`Ship`, `Plane`, `Truck`, `Train`).
  - `Origin -> Destination`: Route label with directional arrow (e.g. `HKG -> LAX`).
  - `Carrier`: Carrier name + code (`MAERSK-01`).
  - `Promised Delivery / Cutoff`: Monospaced date with relative countdown badge (`In 18h` or `Overdue +4.2h`).
  - `Risk Score`: Segmented micro-bar + numeric score (e.g. `85` in coral).
  - `Status`: High-contrast pill badge with status icon.
  - `Actions`: Contextual menu (`...`) with options: *View Detail*, *Trigger AI Diagnosis*, *Upload Document*, *Simulate Event*.
- **Row Hover & Click:** Hovering highlights the row with `bg-[#142235]`; clicking opens the Shipment Detail view.

---

### Screen 3: Shipment Detail & Dynamic Milestone Timeline
- **Route:** `/shipments/:tracking_id`
- **Purpose:** Deep-dive operational view for a single cargo movement, combining route metadata, milestone progression, document inventory, and active exceptions.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ <- Back to Explorer  │  SHIPMENT SHP-101 (INTERNATIONAL SEA FREIGHT)   [ANALYZE WITH AI]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SUMMARY HUD BANNER:                                                                    │
│ Origin: Hong Kong Port (HKG) -> Destination: Los Angeles Port (LAX)                    │
│ Carrier: Maersk Line | Vessel: MSK-ANTARES | Priority: HIGH | Risk Score: 85 (CRITICAL)│
│ Current Status: EXCEPTION (CUSTOMS_HOLD) | Promised SLA: 2026-10-24 18:00 UTC          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ INTERACTIVE MILESTONE TIMELINE:                                                        │
│  (✓) BOOKED ──> (✓) CONTAINER GATE-IN ──> [!] CUSTOMS CLEARANCE ──> ( ) VESSEL DEPART  │
│  Oct 14 09:00    Oct 16 14:00             Oct 17 10:00 (OVERDUE +6h) Oct 18 18:00      │
│  Status: Done    Status: Done             STATUS: HOLD (Missing Invoice) Scheduled    │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ DOCUMENT INVENTORY & AUDIT               │ ACTIVE EXCEPTIONS & AI ROOT CAUSE           │
│ ┌──────────────────────────────────────┐ │ ┌─────────────────────────────────────────┐ │
│ │ [PDF] Commercial Invoice: [MISSING]  │ │ │ [!] CRITICAL: MISSING_DOCUMENT          │ │
│ │       Required for Customs Filing    │ │ │ Detected: Oct 17 04:00 (APScheduler)    │ │
│ │       Action: [Upload] [Request]     │ │ │ Root Cause: Shipper omitted commercial  │ │
│ ├──────────────────────────────────────┤ │ │ invoice prior to container cutoff.      │ │
│ │ [PDF] Packing List: [VALIDATED 94%]  │ │ │ Evidence: Expected cutoff 10:00 AM;     │ │
│ │       Extracted: 310 kg, 12 pallets  │ │ │ invoice not uploaded in DB.             │ │
│ │       Action: [View Extracted JSON]  │ │ │ Recommended: Trigger correction task    │ │
│ └──────────────────────────────────────┘ │ └─────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Component Specifications
1. **Header HUD Banner:**
   - Prominently displays `SHP-101`, transport mode badge (`SEA`), and business priority (`HIGH`).
   - Origin/destination pill with transit route glyph.
   - Large risk score gauge: `85 / 100` (`CRITICAL`) with pulse dot.
   - Primary Action Button: `"Analyze with Evolus AI"` styled in Cognitive Violet (`#B9A0FF`), triggering Gemma 4 diagnostic inspection.
2. **Interactive Milestone Timeline (`MilestoneTimeline`):**
   - Renders milestones in chronologically ordered sequence (`BOOKED`, `GATE_IN`, `CUSTOMS_CLEARANCE`, `VESSEL_DEPART`, `PORT_ARRIVAL`, `FINAL_DELIVERY`).
   - Node States:
     - *Completed:* Solid mint circle (`#36E0B0`) with `Check` icon + completed timestamp.
     - *In-Progress / Nominal:* Cyan glowing ring (`#38D9FF`) with transport icon.
     - *Overdue / Exception:* Coral pulsing circle (`#FF5D73`) with `AlertTriangle` icon + elapsed delay badge (`+6.2h overdue`).
     - *Upcoming:* Slate ring (`#25364B`) with muted text label.
   - Clicking any milestone node opens a detail drawer showing event provenance, raw carrier telemetry payload, and source system ID.
3. **Split Workspace Panels:**
   - *Left Panel: Document Inventory:* Displays all associated shipment documents with extraction status (`MISSING`, `EXTRACTED`, `VALID`, `DISCREPANCY`). Includes drag-and-drop upload dropzone.
   - *Right Panel: Active Exceptions & AI Diagnosis:* Displays open exceptions, rule-based risk factors, and Gemma 4 diagnostic explanations.

---

### Screen 4: Exception Triage & Bottleneck Resolution Center
- **Route:** `/exceptions`
- **Purpose:** Dedicated triage dashboard for operations coordinators to manage, prioritize, and clear active delivery roadblocks.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ EXCEPTION TRIAGE CENTER                              [Run Full Auto-Scan] [Filter: All]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SEVERITY TIERS:  [Critical (1)]  [High Urgency (2)]  [Medium Caution (1)]  [Resolved]  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [!] EXCEPTION #EXC-901 — CRITICAL RISK (85/100)                     Shipment: SHP-101   │
│ Type: MISSING_DOCUMENT | Category: Customs Clearance | Detected: 2h ago by Scheduler  │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ AI ROOT CAUSE DIAGNOSIS (Gemma 4 31B-it via Evolus AI):                                │
│ "Commercial invoice has not been uploaded 6.0 hours prior to the terminal export       │
│ gate-in cutoff. Vessel MSK-ANTARES will reject container loading if filing is delayed."│
│                                                                                        │
│ PRIMARY EVIDENCE GATHERED:                                                             │
│ • Milestone [CUSTOMS_CLEARANCE] scheduled for 2026-10-17 10:00 UTC (now overdue).     │
│ • Document record for `COMMERCIAL_INVOICE` is NULL in shipment_documents table.        │
│ • Carrier cutoff rule: Sea export requires commercial declaration >= 12h prior.        │
│                                                                                        │
│ RECOMMENDED RESOLUTION ACTIONS:                                                        │
│ [Primary CTA: Request Invoice from Shipper]  [Upload Manually]  [Escalate to Human]    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [!] EXCEPTION #EXC-902 — HIGH RISK (72/100)                         Shipment: SHP-103   │
│ Type: WEIGHT_MISMATCH | Category: Document Reconciliation | Discrepancy: Delta 60.0 kg│
│ Cross-Doc Diff: Commercial Invoice (250 kg) != Packing List (310 kg). Threshold: 0.5kg│
│ [Primary CTA: Open Reconciliation Studio]    [Override Discrepancy]  [Request Revised] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Triage Capabilities
- **Severity Filtering Tabs:** Quick tab selectors for `Critical` (Coral), `High` (Orange), `Medium` (Amber), and `Resolved` (Mint).
- **Evidence Card (`EvidenceCard`):** Each exception item highlights bulleted empirical facts verified by backend models and scheduled checkers.
- **One-Click Corrective Actions:**
  - Safe automated actions (e.g. sending a pre-formatted delay notification or requesting a missing invoice) execute immediately with optimistic UI feedback.
  - Consequential actions (e.g. rescheduling dispatch or overriding customs holds) trigger the Human Approval flow.

---

### Screen 5: Document Validation & Reconciliation Studio
- **Route:** `/documents` or `/documents/:id/reconcile`
- **Purpose:** Visual verification of uploaded freight paperwork, OCR field extraction inspection, and cross-document reconciliation (e.g., Commercial Invoice vs. Packing List).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DOCUMENT VALIDATION & RECONCILIATION STUDIO                          Shipment: SHP-103 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ STATUS: [WEIGHT_MISMATCH DETECTED]  Delta: +60.0 kg (> 0.5kg threshold)  Risk: HIGH    │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ DOCUMENT A: Commercial Invoice (CI-8812) │ DOCUMENT B: Packing List (PL-8812)          │
│ File: `invoice_shp103.pdf` (Extracted)   │ File: `packing_shp103.pdf` (Extracted)      │
│ Overall Confidence: 94.2%                │ Overall Confidence: 91.8%                   │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ FIELD-BY-FIELD CROSS RECONCILIATION DIFF TABLE:                                        │
│ FIELD NAME       │ INVOICE VALUE         │ PACKING LIST VALUE    │ MATCH STATUS        │
│ ─────────────────┼───────────────────────┼───────────────────────┼───────────────────  │
│ Invoice #        │ CI-8812               │ CI-8812 (Ref)         │ [MATCH: VALID]      │
│ Consignee        │ Global Logistics GmbH │ Global Logistics GmbH │ [MATCH: VALID]      │
│ Total Gross Wt   │ 250.0 kg              │ 310.0 kg              │ [MISMATCH: +60.0kg] │
│ Line Item Count  │ 12 Cartons            │ 12 Cartons            │ [MATCH: VALID]      │
│ HS Tariff Code   │ 8471.30.01            │ 8471.30.01            │ [MATCH: VALID]      │
│ Total Declared   │ $48,200.00 USD        │ N/A (Packing List)    │ [INFO: UNCHECKED]   │
├──────────────────────────────────────────┴─────────────────────────────────────────────┤
│ ACTION CONTROLS:                                                                       │
│ [Request Revised Packing List from Shipper]  [Accept Invoice Weight]  [Manual Override]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Studio Capabilities
- **Side-by-Side Dual Document Viewport:** Displays side-by-side preview of the source PDF/scanned image with bounding boxes highlighting extracted key-value pairs.
- **Reconciliation Diff Table:** Compares normalized values extracted by the pipeline:
  - *Identical Values:* Styled with mint check badge `[MATCH: VALID]`.
  - *Discrepancies:* Styled with high-contrast critical coral background `[MISMATCH: +60.0 kg]`.
- **Confidence Score Gauges:** Displays per-field extraction confidence. Any field below `0.80` (80%) is tagged with an amber warning: `"Low Confidence: Manual Verification Required"`.
- **Upload Dropzone:** Allows drag-and-drop file upload supporting PDF, PNG, and JPEG files with instant client-side size (<10MB) and MIME validation.

---

### Screen 6: AI Operations & Copilot Drawer
- **Trigger:** Global shortcut `Cmd+J`, top bar `Copilot` pill, or contextual `"Analyze with Agent"` button.
- **Form Factor:** Dockable 380px (expandable to 520px) slide-over panel on the right edge of the screen with smooth slide transition.
- **Purpose:** Real-time conversational operational assistant powered by **Gemma 4 31B-it** via **Evolus AI**.

```
┌───────────────────────────────────────────────────────────────┐
│ [Sparkles] AETHERIS COPILOT — Gemma 4 (31B-it)     [_] [X]    │
│ Platform: Evolus AI | Dual Headers Active | Latency: 1.8s     │
├───────────────────────────────────────────────────────────────┤
│ CONVERSATION HISTORY                                          │
│                                                               │
│ [User]: "Why is SHP-102 showing a High Risk score?"          │
│                                                               │
│ [Copilot]:                                                    │
│ "Shipment SHP-102 (Chicago -> Dallas) has an explainable risk │
│ score of 68/100 (HIGH). Here is the breakdown:                │
│                                                               │
│ 1. Overdue Milestone: Warehouse Dispatch was planned for      │
│    10:00 UTC today and is now +4.2 hours overdue.             │
│    (Delay Penalty: +8.4 pts)                                  │
│ 2. Active Exception: MILESTONE_OVERDUE recorded by monitoring │
│    scheduler. (Exception Weight: +30.0 pts)                   │
│ 3. SLA Deadline Urgency: Promised delivery is in 22 hours,    │
│    leaving insufficient driving buffer. (+20.0 pts)           │
│ 4. Priority Weight: Swifft Road Carrier (+10.0 pts)           │
│                                                               │
│ Evidence Citations:                                           │
│ [Ref 1: Milestone #ORD-DISPATCH]  [Ref 2: Swifft TMS Ping]    │
│                                                               │
│ Recommended Recovery Action:                                  │
│ Reschedule warehouse pickup to 16:00 UTC and alert consignee. │
│                                                               │
│ [BUTTON: Propose Milestone Reschedule (Requires Sign-Off)]    │
├───────────────────────────────────────────────────────────────┤
│ INPUT BOX:                                                    │
│ [Ask about shipments, root causes, customs regulations...] [^]│
└───────────────────────────────────────────────────────────────┘
```

#### Copilot Specific Capabilities
- **Citation Badges:** Every fact in the agent response is clickable. Clicking `[Ref 1: Milestone #ORD-DISPATCH]` scrolls and flashes the relevant milestone in the main viewport.
- **Tool Invocation Cards:** If the agent recommends a tool call (e.g. `reschedule_milestone` or `send_notification`), it renders an embedded card with inputs pre-filled.
- **Prompt Injection Defense Indicator:** Unobtrusive footer indicator: `Input sanitized with <user_data> boundary delimiters`.
- **Reasoning State:** Displays a violet pulsing indicator: `"Reasoning with Gemma 4 31B-it via Evolus AI..."` during inference.

---

### Screen 7: Human Approval Gateway
- **Route:** `/approvals`
- **Purpose:** Secure operational authorization gate where operations leads review and approve or reject sensitive agent-proposed actions before execution.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ HUMAN APPROVAL GATEWAY                                      Pending Actions: 2 Actions │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [!] ACTION REQUEST #ACT-401                                         Status: PENDING    │
│ Target Shipment: SHP-102 (Swifft Carrier, ORD -> DFW)               Requested: 18m ago │
│ Proposed Action: `reschedule_milestone`                                                │
│ New Dispatch Target: 2026-10-17 16:00 UTC (Original: 10:00 UTC, Delta: +6.0 hours)    │
│                                                                                        │
│ AI JUSTIFICATION & RISK IMPACT:                                                        │
│ • Root Cause: Driver delayed at inbound loading dock #4. Dispatch cannot make 10:00.  │
│ • SLA Consequence: Delivery ETA pushed to Oct 18 14:00 UTC; remains within buyer SLA. │
│ • Cost Impact: $0 (Standard carrier grace period applies).                             │
│                                                                                        │
│ [APPROVE ACTION]                               [REJECT ACTION]                         │
│ (Executes DB update & logs audit)              (Opens required reason modal)           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [!] ACTION REQUEST #ACT-402                                         Status: PENDING    │
│ Target Shipment: SHP-101 (Maersk Line, HKG -> LAX)                  Requested: 42m ago │
│ Proposed Action: `trigger_workflow` (Missing Document Escalation & Expedited Filing)   │
│ [APPROVE ACTION]                               [REJECT ACTION]                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Approval Flow & Friction
- **Approval Flow:** Clicking `Approve Action` displays a brief spinner, executes `POST /api/v1/approvals/{id}/decide` with decision `APPROVED`, removes the item with optimistic UI animation, and displays a success toast.
- **Rejection Flow (Friction Modal):** Clicking `Reject Action` opens a required modal:
  - Title: `"Confirm Rejection of Proposed Action"`
  - Textarea: `"Enter operational reason for rejection (required for audit compliance)..."`
  - Confirm Button: Disabled until at least 5 characters are entered.
  - On submit, updates decision to `REJECTED` and transitions the underlying exception to `MANUAL_INTERVENTION_REQUIRED`.

---

### Screen 8: Recovery Planner & Scenario Simulator (Future / Extended Feature)
- **Route:** `/recovery-planner`
- **Purpose:** Clearly categorized as a **Future Extended Feature**. Simulates rerouting and alternative carrier scenarios for severely disrupted cargo.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ RECOVERY PLANNER & SCENARIO SIMULATOR               [FUTURE FEATURE — SIMULATION MODE] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Select Disrupted Shipment: [ SHP-101 (Hong Kong -> Los Angeles) v ]                    │
│ Current Dilemma: Customs clearance hold threatens vessel departure on Oct 18 18:00     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ COMPARATIVE RECOVERY OPTIONS MATRIX:                                                   │
│ METRIC                 │ OPTION A: CURRENT LANE    │ OPTION B: AIR EXPEDITE (HKG-LAX)  │
│ ───────────────────────┼───────────────────────────┼────────────────────────────────── │
│ Transport Mode         │ Ocean Freight (Maersk)    │ Air Cargo (Cathay Pacific)        │
│ Projected Arrival      │ Oct 28 14:00 UTC (+4 days)│ Oct 20 08:00 UTC (ON SCHEDULE)    │
│ Additional Freight Cost│ $0.00 (Standard)          │ +$3,450.00 USD                    │
│ Demurrage Risk         │ High ($450/day after 48h) │ Zero ($0)                         │
│ Carbon Footprint Delta │ Baseline (1.2 t CO2)      │ +4.8 t CO2                        │
│ Feasibility Confidence │ 45% (Cutoff at risk)      │ 92% (Flight capacity reserved)    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SIMULATED RECOVERY CONTROLS:                                                           │
│ [Simulate Option B Impact]      [Save Scenario to Notes]     [Export Carrier Briefing] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

*Architectural Labeling:* Marked with a persistent disclaimer banner: `"Simulated Recovery Engine: Demonstrates future predictive routing capabilities. Not bound to live booking APIs in current MVP."`

---

### Screen 9: Operational Analytics & Bottleneck Trends (Secondary Feature)
- **Route:** `/analytics`
- **Purpose:** Provides logistics directors with macro-level insights into bottleneck frequency, carrier reliability ratings, and documentation accuracy.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ OPERATIONAL TRENDS & EXCEPTION ANALYTICS                     [Last 7 Days v]  [Export] │
├──────────────────────────────────┬─────────────────────────────────────────────────────┤
│ BOTTLENECK FREQUENCY BY TYPE     │ CARRIER ON-TIME RELIABILITY INDEX                   │
│ • Missing Documents: 42% (Coral) │ • Swifft Transport (Road):   82% [Amber]            │
│ • Warehouse Cutoff:  28% (Amber) │ • Maersk Line (Sea):         91% [Mint]             │
│ • Weight Mismatch:   18% (Coral) │ • FedEx Freight (Road):      97% [Mint]             │
│ • Carrier Detention: 12% (Muted) │ • Lufthansa Cargo (Air):     94% [Mint]             │
├──────────────────────────────────┴─────────────────────────────────────────────────────┤
│ AVERAGE RESOLUTION TIME (HOURS):                                                       │
│ Missing Invoice Request: 2.4h avg  |  Weight Discrepancy Reconciliation: 4.1h avg      │
│ Warehouse Dispatch Reschedule: 1.2h avg  |  Human Approval Turnaround: 24 mins avg     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 10: Immutable Compliance Audit Log
- **Route:** `/audit`
- **Purpose:** Complete regulatory and compliance audit trail displaying chronological history of every event, model inference, tool execution, and human decision.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ COMPLIANCE AUDIT TRAIL                                [Filter by Entity] [Export JSON] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIMESTAMP (UTC) │ ACTOR      │ ACTION NAME                   │ ENTITY ID  │ DETAILS    │
│ ────────────────┼────────────┼───────────────────────────────┼────────────┼─────────── │
│ 14:40:12        │ AGENT      │ `gemma4_diagnostic_inference` │ SHP-101    │ [View Diff]│
│ 14:38:05        │ SYSTEM     │ `milestone_overdue_detected`  │ SHP-102    │ [View Diff]│
│ 14:35:00        │ USER (Lead)│ `action_approved`             │ ACT-401    │ [View Diff]│
│ 14:30:22        │ TOOL       │ `create_correction_task`      │ SHP-101    │ [View Diff]│
│ 14:28:11        │ SYSTEM     │ `document_weight_mismatch`    │ SHP-103    │ [View Diff]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Audit Viewer Capabilities
- **Actor Badging:** Distinct color-coded pills:
  - `AGENT`: Cognitive Violet (`#B9A0FF`)
  - `SYSTEM`: Electric Cyan (`#38D9FF`)
  - `USER`: Operational Mint (`#36E0B0`)
  - `TOOL`: Amber (`#FFB547`)
- **Expandable Payload Inspector:** Clicking any row expands an inline JSON diff viewer displaying before/after entity state and cryptographic audit timestamps.

---

### Screen 11: System Settings & Integration Telemetry Hub
- **Route:** `/settings`
- **Purpose:** Configuration portal for inspecting Evolus AI connection status, background APScheduler health, mock carrier telemetry generators, and tenant parameters.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SYSTEM CONFIGURATION & TELEMETRY HUB                                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ EVOLUS AI PLATFORM CONNECTION:                                                         │
│ Base URL: https://app.evolus.ai/                                                       │
│ Primary Model: gemma4 31B-it (Google Gemma 4 31B Instruction-Tuned)                    │
│ Authentication Status: [ACTIVE] Headers: `X-ApiKey` + `X-Application-Id` Valid         │
│ Credit Balance: 48,250 / 50,000 Credits Allocated  [====-----------------] 96.5% Avail │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ BACKGROUND SERVICES:                                                                   │
│ APScheduler Monitor: [RUNNING] Interval: 300s (5 min) | Last Run: 2 mins ago           │
│ Overdue Threshold: 2.0 hours | Database Connection: PostgreSQL 15 Pool: 10/10 Healthy  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ DEMO SEED & TELEMETRY SIMULATION CONTROLS:                                             │
│ [Re-Seed 5 Demo Scenarios (SHP-101 -> SHP-105)]    [Simulate Inbound Tracking Webhook] │
│ [Toggle Offline Degraded Mock Mode]                [Purge Exception History]           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Reusable Component Inventory & State Matrix

### 7.1 Buttons & Interactive Controls

| Variant | Normal State | Hover State | Active / Pressed | Disabled State |
|---|---|---|---|---|
| **Primary (Cyan)** | `bg-[#38D9FF] text-[#080D18] font-semibold rounded-sm shadow-sm` | `bg-[#2CC0E4] shadow-[0_0_12px_rgba(56,217,255,0.4)]` | `bg-[#20A6C7] scale-[0.98]` | `bg-[#25364B] text-[#73859C] cursor-not-allowed` |
| **Secondary (Ghost)**| `bg-[#142235] text-[#E7EEF8] border border-[#25364B] rounded-sm` | `bg-[#18283A] border-[#38D9FF]/40 text-white` | `bg-[#101B2B] scale-[0.98]` | `border-[#18283A] text-[#4A5A6E]` |
| **Danger (Coral)** | `bg-[#FF5D73] text-white font-semibold rounded-sm shadow-sm` | `bg-[#E64C61] shadow-[0_0_12px_rgba(255,93,115,0.4)]` | `bg-[#CC3D50] scale-[0.98]` | `bg-[#25364B] text-[#73859C]` |
| **AI Action (Violet)**| `bg-[#B9A0FF] text-[#080D18] font-semibold rounded-sm shadow-sm flex items-center gap-2`| `bg-[#A78BFA] shadow-[0_0_15px_rgba(185,160,255,0.45)]`| `bg-[#906EE8] scale-[0.98]`| `bg-[#25364B] text-[#73859C]` |

### 7.2 Status & Risk Badges

| Status / Severity | Background Token | Text Token | Border Token | Visual Icon |
|---|---|---|---|---|
| **Low Risk (0–30)** | `bg-[#36E0B0]/15` | `text-[#36E0B0]` | `border-[#36E0B0]/30` | `CheckCircle2` (14px) |
| **Medium Risk (31–60)**| `bg-[#FFB547]/15` | `text-[#FFB547]` | `border-[#FFB547]/30` | `AlertCircle` (14px) |
| **High Risk (61–80)** | `bg-[#FF8A47]/15` | `text-[#FF8A47]` | `border-[#FF8A47]/30` | `AlertTriangle` (14px)|
| **Critical Risk (81–100)**| `bg-[#FF5D73]/20` | `text-[#FF5D73]` | `border-[#FF5D73]/50` | `Flame` / `OctagonX` (14px) |
| **AI Diagnosed** | `bg-[#B9A0FF]/15` | `text-[#B9A0FF]` | `border-[#B9A0FF]/30` | `Sparkles` (14px) |
| **In Transit** | `bg-[#38D9FF]/15` | `text-[#38D9FF]` | `border-[#38D9FF]/30` | `Compass` (14px) |
| **Delivered** | `bg-[#36E0B0]/20` | `text-[#36E0B0]` | `border-[#36E0B0]/40` | `PackageCheck` (14px) |

### 7.3 Metric HUD Card (`MetricCard`)
- Container: `bg-[#101B2B] border border-[#25364B] rounded-md p-4 flex flex-col justify-between`.
- Top Row: Icon container with subtle tinted background + secondary label (`text-[#9DAEC3] text-xs font-medium uppercase tracking-wider`).
- Middle Value: High-emphasis tabular numbers (`text-[#E7EEF8] text-2xl font-bold font-mono`).
- Bottom Row: Delta indicator (e.g. `+12% vs yesterday` in mint or coral) + mini sparkline graph.

### 7.4 Evidence Card (`EvidenceCard`)
- Container: `bg-[#142235] border border-[#25364B] rounded-md p-4 space-y-2`.
- Header: Subtle icon (`FileText` or `ClockAlert`) + title `Verified Operational Evidence`.
- Key-Value Badges: Renders structured metadata pills with monospaced values (e.g. `Expected Cutoff: 10:00 UTC`, `Current Dwell: 6.2h`, `Discrepancy: +60.0kg`).
- Provenance Footer: Shows data source (`Source: Database Query [shipments & milestones] verified at 14:38:00 UTC`).

---

## 8. End-to-End Operational Workflows

### Workflow 1: Triage Critical Document Bottleneck (`SHP-101` Missing Invoice)
1. **Trigger:** APScheduler flags `SHP-101` (Hong Kong -> Los Angeles) with `MISSING_DOCUMENT` 6h prior to vessel gate-in cutoff. Risk score jumps to `85` (Critical).
2. **Visual Alert:** Command Center map highlights Hong Kong port with a pulsing coral ripple. Bottleneck triage queue places `SHP-101` at top.
3. **Operator Action:** Operator clicks `"Triage Now"`, navigating to `/shipments/SHP-101`.
4. **AI Diagnosis Inspection:** Operator reviews the Evidence Card: Commercial Invoice is absent, container cutoff is in 6 hours.
5. **Action Execution:** Operator clicks `"Request Invoice from Shipper"`.
6. **System Feedback:** Button displays violet spinner: `"Dispatching pre-approved delay advisory..."`. System triggers `send_notification`, logs the action in the audit trail, and marks the task as `IN_PROGRESS`.

### Workflow 2: Cross-Document Weight Discrepancy Resolution (`SHP-103`)
1. **Trigger:** Shipper uploads Commercial Invoice (`250 kg`) and Packing List (`310 kg`) for `SHP-103`.
2. **Detection:** Pipeline flags `WEIGHT_MISMATCH` with delta `60.0 kg` (exceeding `0.5 kg` tolerance).
3. **Operator Action:** Operator navigates to Document Validation Studio (`/documents/SHP-103/reconcile`).
4. **Visual Diff Inspection:** Side-by-side viewer highlights gross weight discrepancy in coral (`250 kg` vs `310 kg`).
5. **Resolution:** Operator selects `"Request Revised Packing List"`, generating a structured follow-up task.

### Workflow 3: Overdue Milestone Triage & Rescheduling (`SHP-102`)
1. **Trigger:** Swifft truck dispatch from Chicago warehouse is overdue by `+4.2 hours`.
2. **Alert:** Milestone node on `/shipments/SHP-102` pulses amber with badge `+4.2h overdue`. Risk score computed at `68`.
3. **Agent Recommendation:** Operator clicks `"Analyze with Agent"`. Gemma 4 diagnoses warehouse dock congestion and recommends rescheduling pickup to 16:00 UTC.
4. **Human Gate Routing:** Because `reschedule_milestone` is a consequential tool, the system routes the proposal to the Approvals Queue.
5. **Sign-off:** Operations lead inspects `/approvals`, verifies SLA impact, and clicks `"Approve Action"`. Milestone updates in DB and risk recalibrates to `35` (Medium).

### Workflow 4: Human-in-the-Loop Rejection with Compliance Reason
1. **Operator Action:** Operations lead navigates to `/approvals` and inspects proposed carrier rebooking for `SHP-105`.
2. **Friction Modal:** Lead clicks `"Reject Action"`. A required dialog opens.
3. **Input:** Lead enters: `"Carrier confirmed driver is already staged at dock door 12. Dispatch imminent."`
4. **Execution:** System records rejection reason in `approvals` table, marks action as `REJECTED`, updates audit log, and notifies coordinator.

### Workflow 5: Global Command Palette (`Cmd+K`) Quick Navigation
1. **Operator Action:** Operator presses `Cmd+K` anywhere in the app.
2. **Input:** Operator types `"SHP-101"` or `"Missing Invoice"`.
3. **Instant Results:** Results show direct links to shipment details, exception triage, and quick actions (`Trigger Health Scan`, `Open Copilot`).
4. **Keyboard Nav:** Arrow keys navigate results; `Enter` opens the selection immediately.

### Workflow 6: Real-time Telemetry Ingestion & Dynamic Risk Recalculation
1. **Trigger:** Mock carrier adapter injects tracking event `TRUCK_BREAKDOWN` for `SHP-104`.
2. **Backend Processing:** Ingestion router calculates new delay delta (+3.5 hours), adds delay penalty, and raises risk score from `12` to `58`.
3. **Frontend Reaction:** Without full page reload, React Query invalidates `/api/v1/shipments`, the route polyline shifts from cyan to amber, and an alert toast appears.

### Workflow 7: Document Upload & Extraction Pipeline
1. **Operator Action:** Operator drags `invoice_shp101.pdf` into the dropzone on `/shipments/SHP-101`.
2. **Client Validation:** System verifies MIME type is `application/pdf` and file size is `1.4 MB` (<10MB limit).
3. **Extraction Feedback:** A progress bar shows `Uploading -> Extracting Fields -> Validating Consistency`.
4. **Completion:** Document status updates to `VALIDATED (94.2% Confidence)`, closing the `MISSING_DOCUMENT` exception.

### Workflow 8: Interactive Copilot Natural Language Inquiry
1. **Operator Action:** Operator opens Copilot (`Cmd+J`) and asks: `"What shipments are at risk of missing customs cutoffs today?"`
2. **Agent Reasoning:** Gemma 4 queries active milestones and documents via Evolus AI.
3. **Structured Response:** Copilot returns formatted list of 2 shipments (`SHP-101`, `SHP-105`) with interactive citation pills.
4. **Deep-Link:** Clicking `[SHP-101]` highlights the shipment directly on the map.

### Workflow 9: Regulatory Compliance Audit Trail Export
1. **Operator Action:** Compliance officer navigates to `/audit`.
2. **Filtering:** Filters by Entity `SHP-101` and Actor `AGENT`.
3. **Inspection:** Expands JSON payload for `gemma4_diagnostic_inference`.
4. **Export:** Clicks `"Export Compliance CSV"`, downloading an audit log with cryptographic timestamps.

### Workflow 10: Handling Degraded Network & Model Offline Fallback
1. **Scenario:** External connection to `https://app.evolus.ai/` times out (>30s) or credit balance is exhausted.
2. **System Behavior:** Backend client switches to deterministic local fallback mode.
3. **Frontend Alert:** Top bar status updates to amber: `DEGRADED [Offline Mock Fallback Active]`.
4. **Safety Enforcement:** Unverified AI actions are blocked; all exceptions default to `REQUIRES_HUMAN_REVIEW` without hallucinating synthetic answers.

---

## 9. API & State Management Architecture

### 9.1 Data Fetching & Caching (TanStack Query)
The frontend manages server state using **TanStack Query (React Query v5)** with fine-grained cache keys:

| Query Key Pattern | Endpoint Called | Refetch Interval | Stale Time | Invalidation Triggers |
|---|---|---|---|---|
| `['shipments', filters]` | `GET /api/v1/shipments` | 30 seconds | 10 seconds | New event, document upload, status update |
| `['shipment', id]` | `GET /api/v1/shipments/{id}`| 15 seconds | 5 seconds | Milestone reschedule, exception cleared |
| `['exceptions', 'open']`| `GET /api/v1/exceptions` | 15 seconds | 5 seconds | Action executed, exception dismissed |
| `['approvals', 'pending']`| `GET /api/v1/approvals` | 10 seconds | 0 seconds | Human approval/rejection submitted |
| `['audit', filters]` | `GET /api/v1/audit` | Manual / 60s | 30 seconds | Any executed action |

### 9.2 Client-Side State Stores (Zustand)
1. **`useMapStore`:** Manages selected shipment ID, active camera viewport, route layer visibility, and hovered node metadata.
2. **`useCopilotStore`:** Manages drawer open/docked state, message history, active reasoning state, and active citations.
3. **`useFilterStore`:** Manages active search query, transport mode filters, risk threshold sliders, and column sorting.
4. **`useUIStore`:** Manages sidebar expanded/collapsed state, theme contrast preferences, and active modal dialogs.

### 9.3 API Service Contracts Mapping (FastAPI `/api/v1`)

```typescript
// frontend/src/types/api.ts

export type TransportMode = 'SEA' | 'AIR' | 'ROAD' | 'RAIL';
export type ShipmentStatus = 'BOOKED' | 'PICKED_UP' | 'IN_TRANSIT' | 'AT_WAREHOUSE' | 'CUSTOMS_HOLD' | 'DELIVERED' | 'EXCEPTION';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Shipment {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  carrier_id: string;
  status: ShipmentStatus;
  promised_delivery_date: string;
  business_priority: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_score: number;
  created_at: string;
}

export interface Milestone {
  id: string;
  shipment_id: string;
  milestone_name: string;
  expected_at: string;
  completed_at: string | null;
  is_completed: boolean;
  source: string;
}

export interface ExceptionItem {
  id: string;
  shipment_id: string;
  exception_type: string;
  risk_level: RiskLevel;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  description: string;
  evidence: Record<string, any>;
  root_cause: string | null;
  detected_at: string;
}

export interface ApprovalItem {
  id: string;
  action_id: string;
  shipment_id: string;
  proposed_action: string;
  justification: string;
  risk_level: RiskLevel;
  requested_at: string;
  decision: 'PENDING' | 'APPROVED' | 'REJECTED';
}
```

---

## 10. Accessibility, Internationalization, and Responsive Rules

### 10.1 WCAG 2.1 AA Conformance Matrix
- **Color Contrast:** All body text (`#E7EEF8` and `#9DAEC3`) exceeds a **7.0:1** contrast ratio against `#080D18` and `#101B2B` surfaces, surpassing WCAG AAA requirements. Muted metadata (`#73859C`) meets **4.8:1** (exceeding AA 4.5:1).
- **Non-Color Reliance:** Every status indicator pairs color with an explicit semantic icon and text label (e.g. coral color is accompanied by an `OctagonAlert` icon and the word `"CRITICAL"`).
- **Focus Rings:** All interactive buttons, links, and inputs feature an electric cyan focus ring (`ring-2 ring-[#38D9FF] ring-offset-2 ring-offset-[#080D18]`).
- **Screen Reader Landmarks:** Proper semantic HTML (`<header>`, `<nav>`, `<main>`, `<aside>`, `<section>`) with ARIA labels (`aria-label="Global Shipment Map"`, `aria-live="polite"` on the triage queue).

### 10.2 Keyboard Navigation Shortcuts Cheat Sheet

| Key Combination | Action |
|---|---|
| `Cmd + K` / `Ctrl + K` | Open Global Command Search |
| `Cmd + J` / `Ctrl + J` | Toggle AI Copilot Drawer |
| `G then D` | Navigate to Command Center Dashboard |
| `G then S` | Navigate to Shipment Explorer |
| `G then E` | Navigate to Exception Center |
| `G then A` | Navigate to Approvals Queue |
| `Escape` | Dismiss open drawer, modal, or command palette |
| `Tab` / `Shift + Tab` | Sequential keyboard focus navigation through cards |
| `Space` / `Enter` | Select active focused shipment or trigger action |

### 10.3 Responsive Layout Adaptations
- **Desktop Ultra-Wide & Dual Monitor ($\ge 1440\text{px}$):** Full three-column layout (Left Rail + Map + Bottleneck Feed + Docked Copilot).
- **Standard Laptop ($1024\text{px} - 1439\text{px}$):** Left rail collapses to icon-only mode (64px); Copilot functions as a floating slide-over drawer.
- **Tablet / Operations Pad ($768\text{px} - 1023\text{px}$):** Hero map stacks above the bottleneck feed. Tables scroll horizontally with sticky tracking number columns.
- **Mobile (< $768\text{px}$):** Read-only alert triage view; maps toggle to tabular card lists; bottom navigation bar. *(Note: Dispatch operations are primary desktop workflows).*

---

## 11. Frontend Implementation Roadmap & Quality Checklist

### 11.1 Directory Structure Target (`frontend/src/`)
```
frontend/src/
├── main.tsx
├── App.tsx
├── index.css                   # Tailwind base imports + custom scrollbar & glows
├── components/
│   ├── layout/
│   │   ├── TopTelemetryBar.tsx # Global clock, status indicators, credit gauge
│   │   ├── NavRail.tsx         # Collapsible left navigation rail
│   │   ├── CommandPalette.tsx  # Cmd+K search modal
│   │   └── AppShell.tsx        # Top-level grid container
│   ├── map/
│   │   ├── LogisticsMap.tsx    # MapLibre GL JS dark vector container
│   │   ├── RouteOverlay.tsx    # Geodesic arc polylines & pulse animations
│   │   ├── NodeMarker.tsx      # Port, Airport, Warehouse SVG markers
│   │   └── MapControls.tsx     # Floating mode and risk filter HUD
│   ├── dashboard/
│   │   ├── MetricHudCard.tsx   # Top KPI counters with sparklines
│   │   └── TriageFeed.tsx      # Real-time sorted exception queue
│   ├── shipments/
│   │   ├── ShipmentTable.tsx   # Searchable data grid with sorting
│   │   ├── MilestoneTimeline.tsx# Interactive horizontal/vertical timeline
│   │   └── ShipmentHeaderHud.tsx# Header banner with origin/destination HUD
│   ├── documents/
│   │   ├── DocumentReconcileStudio.tsx # Side-by-side split pane diff viewer
│   │   └── FileUploadDropzone.tsx      # Drag-and-drop file uploader
│   ├── copilot/
│   │   ├── CopilotDrawer.tsx   # Slide-over chat panel
│   │   ├── MessageBubble.tsx   # Formatted response with citation pills
│   │   └── ToolActionCard.tsx  # Pre-filled action card with approval gate
│   ├── approvals/
│   │   ├── ApprovalCard.tsx    # Action card with Approve/Reject buttons
│   │   └── RejectionModal.tsx  # Friction dialog requiring reason input
│   └── common/
│       ├── Button.tsx          # Design token button variants
│       ├── StatusBadge.tsx     # Risk and status pill badges
│       ├── EvidenceCard.tsx    # Key-value fact container
│       └── SkeletonLoader.tsx  # Custom pulse skeletons
├── services/
│   ├── api.ts                  # Axios / fetch client with base URL
│   ├── shipmentService.ts
│   ├── exceptionService.ts
│   ├── documentService.ts
│   ├── approvalService.ts
│   └── agentService.ts
├── store/
│   ├── useMapStore.ts
│   ├── useCopilotStore.ts
│   └── useFilterStore.ts
└── types/
    └── index.ts                # TypeScript domain models
```

### 11.2 Frontend Coding Agent Phased Checklist

#### Phase 1: Shell & Token Scaffolding
- [ ] Initialize Tailwind configuration with exact hex tokens (`#080D18`, `#101B2B`, `#38D9FF`, `#FF5D73`, etc.).
- [ ] Implement `AppShell.tsx`, `TopTelemetryBar.tsx`, and `NavRail.tsx`.
- [ ] Verify UTC dual clock and live status indicator pulsing animation.

#### Phase 2: Signature Feature — Global Command Map
- [ ] Install and configure MapLibre GL JS with custom dark vector basemap.
- [ ] Render origin-to-destination geodesic arc polylines.
- [ ] Implement cyan/mint transit pulses and coral bottleneck alert rings.
- [ ] Add camera `flyTo` transitions triggered by shipment selection.
- [ ] Implement SVG fallback for offline / low-resource environments.

#### Phase 3: Core Dashboards & Timelines
- [ ] Build `MetricHudCard.tsx` row with 4 primary operational counters.
- [ ] Build `TriageFeed.tsx` rendering active exceptions sorted by risk score.
- [ ] Build `MilestoneTimeline.tsx` supporting Completed, In-Progress, Overdue, and Future states.

#### Phase 4: Document Validation & Reconciliation Studio
- [ ] Build split-pane side-by-side document inspection view.
- [ ] Implement cross-document field diff table highlighting discrepancies in coral.
- [ ] Build drag-and-drop file upload dropzone with MIME and size validation.

#### Phase 5: AI Copilot Drawer & Approvals Gateway
- [ ] Implement `CopilotDrawer.tsx` slide-over with `Cmd+J` hotkey listener.
- [ ] Render interactive citation pills linking agent text to shipment milestones.
- [ ] Build `ApprovalCard.tsx` with one-click approval and friction rejection modal.

#### Phase 6: Compliance Audit & Demo Controls
- [ ] Implement `AuditTable.tsx` with expandable JSON payload diff viewer.
- [ ] Add Demo Seed controls to trigger simulated events and re-seed database.
- [ ] Conduct full WCAG 2.1 AA accessibility and keyboard navigation audit.

