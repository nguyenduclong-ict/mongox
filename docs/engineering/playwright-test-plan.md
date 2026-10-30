# Playwright End-to-End (E2E) Test Plan

## 1. Executive Summary

This document establishes the end-to-end testing strategy, automation architecture, and scenario coverage matrix for Mongox using **Playwright**. The test suite validates user interactions, action modal lifecycles, real-time database integrations, and high-performance viewport rendering.

## 2. Test Environment Architecture

```text
┌────────────────────────────────────────────────────────┐
│               Playwright Test Runner                   │
│         (Chromium, WebKit, Firefox Engines)            │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTP / Localhost:4173 (Vite Preview)
                            │
┌───────────────────────────▼────────────────────────────┐
│              Mongox Frontend Application               │
│        React 19 + TypeScript + Tailwind CSS            │
└───────────────────────────┬────────────────────────────┘
                            │
             Tauri IPC / Native Engine Bridge
                            │
┌───────────────────────────▼────────────────────────────┐
│        Local MongoDB Test Container (Docker)           │
│        `mongodb://mongox:mongoxpass@localhost:27017`   │
│        Seeded with `test_db` (5,000+ documents)        │
└────────────────────────────────────────────────────────┘
```

### 2.1. Local Containerized Database
- Mongox provides `docker-compose.yml` to spin up a standardized MongoDB 7.0 container:
  ```bash
  docker compose up -d
  ```
- **Seeded Collections (`docker/init-mongo.js`)**:
  - `customers`: 100 documents with unique emails, phone numbers, and balances.
  - `orders`: 500 documents with foreign customer references and statuses.
  - `products`: 50 catalog items across multiple categories.
  - `large_dataset`: 5,000 indexed records for stress-testing virtualized rendering.

## 3. Comprehensive E2E Scenario Coverage Matrix

| Test Suite | Spec File | Scenarios Covered | Quality Gate |
|---|---|---|---|
| **Connection Lifecycle** | `e2e/connection-lifecycle.spec.ts` | 1. Listing saved connection profiles.<br>2. Form switching (URI vs Host/Port/Auth/TLS).<br>3. Environment classification (`Local`, `Production`).<br>4. Ping latency measurement.<br>5. Production Guard warning banner display. | Profile saved to disk with sanitized credentials. |
| **Object Explorer** | `e2e/object-explorer.spec.ts` | 1. Multi-connection tree hierarchy expansion.<br>2. Real-time search filtering on databases and collections.<br>3. Database/collection selection activating workspaces.<br>4. Hover action buttons (Backup, Export, Import).<br>5. Sidebar footer integration (Open Backups, Settings). | Dynamic search filter updates without UI lag. |
| **Collection Workspace** | `e2e/collection-workspace.spec.ts` | 1. Multi-tab navigation (Documents, Indexes, Schema Analysis).<br>2. Empty/initial state diagnostics when disconnected.<br>3. Collection sub-header modal action buttons.<br>4. Query filter and sort preservation across tab switches. | 100% active state retention. |
| **Document Explorer & CRUD** | `e2e/document-crud.spec.ts` | 1. Query Bar execution (filter, sort, limit, skip).<br>2. View mode switching (Table, Tree, Raw JSON).<br>3. In-place table cell editing with Enter commit.<br>4. Insert Document modal with JSON formatting validation.<br>5. Document deletion. | Primary key `_id` immutability preserved. |
| **Index Management** | `e2e/index-manager.spec.ts` | 1. Listing collection indexes with memory footprint.<br>2. Displaying Unique and Sparse tags.<br>3. Creating single-field and compound indexes.<br>4. Safe index dropping (with `_id_` deletion locked). | Protection of primary key index. |
| **Schema Analyzer** | `e2e/schema-analyzer.spec.ts` | 1. Sampling document batches (100-500 docs).<br>2. Calculating field presence rates (100% vs Optional).<br>3. Visualizing BSON polymorphic type distributions.<br>4. Detecting schema drift. | Accurate type representation. |
| **Action Modals (Backup/Restore)** | `e2e/backup-and-restore-modals.spec.ts` | 1. Auto-resolving managed backup directory (`%LOCALAPPDATA%\Mongox\backups`).<br>2. Auto-generating timestamped archive filenames.<br>3. Gzip and Archive flag toggling.<br>4. 1-click archive selection from detected disk files.<br>5. Archive header inspection. | Native folder opening integration. |
| **Action Modals (Export/Import)** | `e2e/export-and-import-wizards.spec.ts` | 1. Format selection (JSON Array, CSV, NDJSON).<br>2. Field inclusion toggles.<br>3. Smart Data Masking rules (Email, Phone, SHA-256 hash, Redact).<br>4. Previewing initial 10 records for imports.<br>5. Key collision policies (`Upsert`, `Skip`, `Stop on Error`). | In-memory PII masking prior to file write. |
| **Production Guard** | `e2e/production-guard.spec.ts` | 1. Intercepting destructive commands in `Production`.<br>2. Enforcing exact target entity name typing.<br>3. Disabling confirmation button on mismatched input.<br>4. Successful confirmation and execution. | Zero accidental data deletions. |
| **Settings Hub** | `e2e/settings-and-tools.spec.ts` | 1. Opening Settings via Header/Sidebar gear icon (`⚙️`).<br>2. Checking status of 5 official CLI tools (`mongosh`, `tools`).<br>3. Storage directory inspection and Explorer opener.<br>4. General preferences (page limit, theme). | Modal isolation without disrupting main view. |
| **Large Dataset Scalability** | `e2e/large-dataset-performance.spec.ts` | 1. Rendering 1,000+ to 5,000 documents.<br>2. Virtualized table scrolling retaining steady 60 FPS.<br>3. Pinned `_id` column during 2D scrolling.<br>4. Sub-100ms pagination response.<br>5. Bounding DOM node count under 1,500 elements. | No UI freezing or layout shifts (CLS < 0.1). |

## 4. Test Execution Workflows

### 4.1. Prerequisites
Start the containerized MongoDB test instance:
```bash
docker compose up -d
```

### 4.2. Running All E2E Tests
Execute the complete Playwright test suite:
```bash
npm run test:e2e
```

### 4.3. Interactive Debugging & UI Mode
To inspect test steps visually with Playwright Inspector:
```bash
npx playwright test --ui
```

### 4.4. Targeted Suite Execution
To run an individual feature test file:
```bash
npx playwright test e2e/connection-lifecycle.spec.ts
npx playwright test e2e/large-dataset-performance.spec.ts
```

## 5. Continuous Integration (CI) Quality Gates

In automated CI pipelines, tests run in headless mode against a transient container. Build validation enforces:
1. 100% test pass rate across all suites.
2. Zero console errors or unhandled promise rejections.
3. DOM node bounding under 1,500 elements during large dataset browsing.
4. Retention of test reports and failure screenshots as build artifacts.

## 6. Related Documents

- [Development Setup](./setup.md)
- [Testing Guidelines](./testing.md)
- [System-Wide Requirements](../product/requirements.md)
- [Workspace & Ergonomics Specification](../specifications/features/workspace-and-ergonomics/spec.md)
