# Project Implementation Roadmap

This document outlines the phased delivery milestones for the Mongox desktop client.

## 1. Roadmap Overview

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Phase 1 (P1)  │ ──► │   Phase 2 (P2)  │ ──► │   Phase 3 (P3)  │
│   Foundation &  │     │   Connection &  │     │  Document CRUD  │
│   Provisioning  │     │   Navigation    │     │   & Explorer    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐                             ┌─────────────────┐
│   Phase 5 (P5)  │ ◄────────────────────────── │   Phase 4 (P4)  │
│   Refinement &  │                             │  Advanced Tools │
│    Packaging    │                             │  & Performance  │
└─────────────────┘                             └─────────────────┘
```

## 2. Phase Breakdown

### Phase 1 (P1): Core Foundation & Auto-Provisioning (Completed)
- **Objectives:**
  - Initialize Tauri v2 and React 19 + TypeScript + Vite project scaffolding.
  - Implement `provisioner.rs` to detect local `mongosh` and `mongodb-database-tools`.
  - Implement automated download, SHA-256 validation, and archive extraction from MongoDB CDN.
  - Build `ProvisioningModal` on the frontend with progress streaming.
- **Deliverables:**
  - Application launches, validates environment, and provisions required CLI tools automatically. [Completed]

### Phase 2 (P2): Connection Management & Hierarchy Navigation
- **Objectives:**
  - Implement `connection.rs` with OS credential vault integration for password storage.
  - Build `ConnectionModal` supporting standard and SRV connection strings.
  - Implement background ping checks to measure real-time latency.
  - Build `Sidebar` tree rendering active clusters, databases, and collections with size/count badges.
  - Implement `Header` with breadcrumb navigation and connection status badges.
- **Deliverables:**
  - Full connection lifecycle management with live server connectivity and schema discovery.

### Phase 3 (P3): Document Explorer & CRUD Workspaces
- **Objectives:**
  - Build `QueryBar` supporting JSON filter, sort, project, limit, and skip parameters.
  - Implement `TableView` with pinned `_id` and BSON data type chips.
  - Implement interactive `TreeView` with expandable nodes and inline editing.
  - Implement `RawJsonView` with syntax highlighting and formatting.
  - Implement document creation, duplication, in-place edit, and deletion modals.
  - Implement `ProductionGuardModal` for destructive operations in production environments.
- **Deliverables:**
  - Complete document inspection and CRUD capabilities across three synchronized view modes.

### Phase 4 (P4): Advanced Tooling Hub
- **Objectives:**
  - Implement `Backup & Restore Hub` wrapping `mongodump` and `mongorestore` with Gzip compression and progress monitoring.
  - Implement `Export & Import Wizard` supporting JSON, CSV, and NDJSON with Smart Data Masking.
  - Implement `PipelineBuilder` for visual aggregation composition and stage-by-stage previews.
  - Implement `IndexView` for index creation, storage metrics, and visual query execution explain plans.
  - Implement `ScriptConsole` for interactive `mongosh` JavaScript script execution.
  - Implement `ServerMonitor` for real-time cluster operations per second and connection telemetry.
- **Deliverables:**
  - Full suite of administrative, diagnostic, and data management tools.

### Phase 5 (P5): UI/UX Refinement, Performance, & Distribution Packaging
- **Objectives:**
  - Implement global `Command Palette (Ctrl + K)` for rapid navigation and action execution.
  - Integrate virtualized table rendering (`@tanstack/react-virtual`) for handling large datasets smoothly.
  - Perform dark-theme color and layout tuning.
  - Configure multi-platform CI/CD release build workflows (Windows MSI/NSIS, macOS DMG, Linux AppImage/deb).
- **Deliverables:**
  - Production-ready release packages verified across Windows, macOS, and Linux.

## 3. Related Documents

- [Product Overview](../product/overview.md)
- [Product Requirements](../product/requirements.md)
- [System Architecture Overview](../architecture/system-overview.md)
- [Development Setup](../engineering/setup.md)
