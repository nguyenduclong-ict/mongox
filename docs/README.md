# Mongox Documentation

Welcome to the Mongox project documentation. Mongox is a modern, lightweight, high-performance desktop administration client for MongoDB built with Tauri v2, Rust, React 19, and Tailwind CSS.

## Documentation Structure

```text
docs/
├── README.md                      # Central documentation index (this file)
├── product/                       # Product vision, requirements, and domain terms
│   ├── overview.md                # Product overview, core value proposition, personas
│   ├── requirements.md            # High-level functional and non-functional requirements
│   └── glossary.md                # Domain terminology and definitions
├── architecture/                  # Architectural diagrams, principles, and ADRs
│   ├── system-overview.md         # System components, IPC bridge, engine integration
│   └── decisions/                 # Architecture Decision Records (ADRs)
│       ├── 0001-tauri-v2-architecture.md
│       ├── 0002-zero-setup-auto-provisioning.md
│       ├── 0003-linear-design-system.md
│       └── 0004-ergonomic-workspace-and-action-modals.md
├── specifications/                # Detailed technical specifications
│   └── features/                  # Feature-specific specifications
│       ├── auto-provisioning/spec.md
│       ├── connection-manager/spec.md
│       ├── document-explorer/spec.md
│       ├── backup-restore/spec.md
│       ├── export-import/spec.md
│       └── workspace-and-ergonomics/spec.md
├── engineering/                   # Engineering guidelines and development workflows
│   ├── setup.md                   # Local setup, prerequisites, and build steps
│   ├── guidelines.md              # Code standards, formatting, project structure
│   ├── security.md                # Credential handling, subprocess isolation, safety guards
│   ├── testing.md                 # Automated quality gates, unit & integration tests
│   └── playwright-test-plan.md    # Playwright E2E automation architecture and coverage
└── project/                       # Project management and milestone planning
    └── roadmap.md                 # Implementation roadmap and phase breakdown
```

## Quick Navigation

### Product & Requirements
- [Product Overview](./product/overview.md): Vision, objectives, and target audience.
- [Product Requirements](./product/requirements.md): System-wide functional and non-functional specifications.
- [Domain Glossary](./product/glossary.md): MongoDB and Mongox terms and abbreviations.

### Architecture & Decisions
- [System Architecture Overview](./architecture/system-overview.md): High-level system design and subprocess execution model.
- [ADR-0001: Tauri v2 Framework Selection](./architecture/decisions/0001-tauri-v2-architecture.md): Choice of Tauri v2 and Rust.
- [ADR-0002: Zero-Setup Auto-Provisioning Engine](./architecture/decisions/0002-zero-setup-auto-provisioning.md): Strategy for `mongosh` and database tools delivery.
- [ADR-0003: Linear-Inspired Design System](./architecture/decisions/0003-linear-design-system.md): Adoption of Linear.app design tokens and ergonomics.
- [ADR-0004: Ergonomic Workspace & Action Modals](./architecture/decisions/0004-ergonomic-workspace-and-action-modals.md): Migration to Object Explorer tree and Action Modals.

### Feature Specifications
- [Zero-Setup Auto-Provisioning Specification](./specifications/features/auto-provisioning/spec.md): Engine detection and background download.
- [Connection Manager Specification](./specifications/features/connection-manager/spec.md): Profile management, latency monitoring, and Production Guard.
- [Document Explorer Specification](./specifications/features/document-explorer/spec.md): Query bar, Table, Tree, and Raw JSON views.
- [Backup & Restore Hub Specification](./specifications/features/backup-restore/spec.md): `mongodump` and `mongorestore` wrapper workflows.
- [Export & Import Wizard Specification](./specifications/features/export-import/spec.md): JSON/CSV data transfer with data masking.
- [Workspace & Ergonomics Productivity Suite](./specifications/features/workspace-and-ergonomics/spec.md): Object Explorer, multi-tabs, in-place table cell editing, and Explain Plan.

### Engineering & Operations
- [Development Setup](./engineering/setup.md): Prerequisites and local environment configuration.
- [Engineering Guidelines](./engineering/guidelines.md): Code style, project structure conventions, and standards.
- [Security Guidelines](./engineering/security.md): Credential protection and process sandboxing.
- [Testing Guidelines](./engineering/testing.md): Automated quality gates, unit tests, and CI/CD.
- [Playwright E2E Test Plan](./engineering/playwright-test-plan.md): End-to-end scenario coverage matrix and containerized testing.
- [Project Roadmap](./project/roadmap.md): Phased execution plan from P1 to P6.
