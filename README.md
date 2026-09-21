# Panoptext Visualiser — Elastic Workflows Visual Editor

A modern, standalone, bi-directional visual (drag-and-drop) workflow editor designed specifically for **Kibana Workflows** (Elasticsearch / Elastic Stack).

---

## 🚀 Key Features

- **Visual Graph Canvas (React Flow):**
  - Intuitive visualization of Triggers (Manual, Scheduled, Alert, Event) and execution steps.
  - Drag-and-drop palette covering Elasticsearch, Kibana, Console, HTTP, Flow Control, Connectors (Slack, Jira, PagerDuty), and AI steps.
  - Dagre-based auto-layout engine (`layoutGraph()`) with `Ctrl+D` shortcut.
  - Step-level schema status and visual alert badges on graph nodes.

- **CodeMirror 6 YAML Source Editor:**
  - Real-time syntax highlighting, indentation guides, and inline schema diagnostics (linter).
  - **Loop-free bi-directional synchronization:** Origin tagging (`origin: 'canvas'` vs `'yaml'`) with ~300ms debounce.
  - Resilient design: syntax errors never break the canvas graph.

- **Kibana Schema Validation Engine (445+ Step Types & 25 Trigger Types):**
  - Authoritative validation against the official Kibana Workflows JSON Schema (Draft-07).
  - Validates required step fields (`connector-id`, `foreach`, `steps`, `condition`, `with`).
  - Validates `with` parameter constraints for specific operations (e.g. `index`, `message`, `query`, `duration`).
  - Catches deep Elasticsearch Query DSL errors (e.g., boolean `term` filter requirements).
  - Typo detection with Levenshtein distance matching against allowed properties.

- **💡 Smart Suggestions & 1-Click Quick Fix:**
  - **Connector ID Auto-fill:** Intelligently identifies connector type (Slack, Jira, PagerDuty, etc.) and provides a valid placeholder ID.
  - **Inferred Foreach Expressions:** Scans preceding search/aggregation steps to automatically suggest exact bucket expressions (e.g. `{{ steps.top_sources.output.aggregations.by_host.buckets }}`) or hits arrays.
  - **Control Flow Scaffolding:** Fills empty `steps` or missing conditions with contextual default step skeletons.
  - **1-Click Execution:** Apply individual fixes or resolve all workflow issues at once using the **"Fix All" (Tümünü Düzelt)** action.
  - **Node Inspector Integration:** Inspecting a highlighted node in the Properties panel displays its schema errors with a direct Quick Fix button.

- **Lossless Round-Trip Guarantee (`eemeli/yaml` AST):**
  - Comments (`#`), custom formatting, top-level metadata (`consts`, `inputs`, `outputs`, `settings`), and unknown/custom steps are strictly preserved.
  - Custom or proprietary steps appear safely as "Generic" nodes on the canvas.

- **Multi-Cluster Connection Management:**
  - Connect to multiple Kibana clusters (Dev, Staging, Production) or local Mock mode via the connection selector.
  - API keys are securely managed and masked by the Fastify backend proxy.
  - Insecure TLS / self-signed certificate support and 1-click connection health ping.

- **Safe Save & Git-style Diff Preview:**
  - `Ctrl+S` quick save.
  - Visual Diff Modal comparing current changes against the live Kibana definition before saving.
  - Concurrency conflict detection (HTTP 409) based on `updatedAt` timestamps.

- **Responsive Theme Support:**
  - Dark and light themes tailored to the Kibana Elastic UI (EUI) design system.

---

## 📁 Project Architecture

```text
elastic-workflows-editor/
├── package.json               # Root npm workspace scripts (concurrently)
├── .env.example / .env        # Server & proxy environment configuration
├── docs/
│   └── api-notes.md           # Kibana Workflows API and schema research notes
├── server/                    # Fastify Backend Proxy
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/
│   │   ├── connections.example.json # Template for cluster connection profiles
│   │   ├── users.example.json       # Template for authentication accounts
│   │   └── schemaCatalog.json       # Indexed 445+ step types & 25 trigger types
│   └── src/
│       ├── index.ts           # Fastify server, REST endpoints, CORS & TLS
│       ├── types.ts           # Shared TypeScript interfaces
│       ├── connectionsStore.ts# Multi-cluster credentials store
│       ├── authStore.ts       # Authentication & user profile store
│       ├── workflowValidator.ts # Server-side schema validator
│       ├── mockData.ts        # Built-in sample workflows
│       └── kibanaClient.ts    # Kibana Workflows API client
└── frontend/                  # React + TypeScript + Vite Client
    ├── package.json
    ├── vite.config.ts         # Vite configuration & HTTPS reverse proxy
    └── src/
        ├── App.tsx            # Main application layout & two-way sync orchestrator
        ├── components/
        │   ├── TopBar.tsx     # Navigation, workflow selector, save & clusters
        │   ├── Palette.tsx    # Drag-and-drop step/trigger palette
        │   ├── Canvas.tsx     # React Flow canvas, minimap, controls & layout
        │   ├── Properties.tsx # Selected step parameter inspector & quick fixes
        │   ├── YamlEditor.tsx # CodeMirror 6 editor, linter & Quick Fix drawer
        │   ├── DiffModal.tsx  # Pre-save Git-style visual diff modal
        │   └── SettingsDrawer.tsx # Cluster connection & credentials drawer
        ├── flow/
        │   ├── layout.ts      # Dagre auto-layout graph abstraction
        │   └── nodes/         # Custom React Flow nodes (Trigger, Step, If, Foreach)
        └── services/
            ├── api.ts         # Backend REST API client
            ├── schemaCatalog.json # Kibana JSON Schema catalog
            ├── validator.ts   # Client-side schema validator & Quick Fix engine
            └── yamlSync.ts    # Lossless AST bidirectional synchronization
```

---

## ⚙️ Getting Started

### 1. Prerequisites
- **Node.js**: v20 or v22 LTS
- **npm**: v9 or higher

### 2. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Configure `.env` if connecting to a live Kibana cluster:
```env
# Kibana Cluster Settings
KIBANA_URL=https://kibana.example.com:5601
KIBANA_API_KEY=your_base64_api_key_here
KIBANA_SPACE=default
KIBANA_INSECURE_TLS=false

# Mock Mode (set to true to test locally without Kibana)
MOCK_MODE=false

# Server Ports
PORT=3001
HOST=0.0.0.0
```

> **Tip:** You can also dynamically add and switch between multiple Kibana clusters directly from the UI using the **Cluster Connections** menu without modifying `.env`.

### 3. Start Development Server
Run both the Fastify backend server (`https://localhost:3001`) and the Vite client (`https://localhost:5173`):
```bash
npm run dev
```

Open your browser at:
```text
https://localhost:5173
```

### 4. Running Tests
Run the Vitest test suite covering YAML lossless round-trips, official schema validation, and smart quick fix assertions:
```bash
npm run test
```

### 5. Production Build
Compile both backend TypeScript and frontend Vite assets:
```bash
npm run build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Ctrl + S`** / **`Cmd + S`** | Save current workflow to Kibana / Mock storage |
| **`Ctrl + D`** / **`Cmd + D`** | Auto-align and layout graph nodes (`layoutGraph`) |
| **`Delete`** / **`Backspace`** | Remove selected step node or connection edge |

---

## 🛡️ Security & Privacy
- Sensitive cluster credentials (`connections.json`), local user credentials (`users.json`), SSL certificates (`certs/`), and `.env` files are ignored by `.gitignore`.
- API keys are never exposed in the browser bundle; all external Kibana API requests are brokered through the Fastify backend proxy.

---

## 📄 License
MIT License. Created for the Elastic Community and Kibana Workflows ecosystem.
