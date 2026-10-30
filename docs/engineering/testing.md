# Testing Strategy & Automated Quality Gates

This document defines the comprehensive testing strategy, test layers, and verification commands for Mongox.

## 1. Testing Pyramid

Mongox employs a 3-tier testing pyramid balancing speed, isolation, and end-to-end integration:

```text
                  ▲
                 / \
                /E2E\       Playwright Automated Scenarios (10 Suites)
               /─────\
              / Integ \     Rust Integration Tests (core_feature_tests.rs)
             /─────────\
            /   Unit    \   Rust Crate Unit Tests & TypeScript Typechecking
           /─────────────\
```

### 1.1. Tier 1: Unit Tests & Type Safety
- **Rust Backend**: Unit tests co-located inside modules (`provisioner.rs`, `connection.rs`, `process_runner.rs`, `backup_service.rs`, `export_import.rs`) validating pure functions, URI parsing, password sanitization, checksum validation, and argument construction.
- **Frontend**: Strict TypeScript compilation (`tsc --noEmit`) ensuring zero type discrepancies between Rust DTOs and React components.

### 1.2. Tier 2: Rust Integration Tests
- Located in `src-tauri/tests/core_feature_tests.rs`.
- Exercises end-to-end Rust workflows:
  - Connection profile persistence and disk reload.
  - Query parameter compilation with complex filters, sorts, and limits.
  - Backup & restore command builders with gzip and single-archive packaging.
  - Smart Data Masking engine (Email, Phone, SHA-256 hash, Redaction).
  - CSV and NDJSON preview parsing.
  - Managed backup directory discovery and archive listing.
  - Safe error propagation when external CLI engines are missing.

### 1.3. Tier 3: Playwright End-to-End Tests
- Located in `e2e/`.
- Validates the entire user experience in Chromium/WebKit engines:
  - Connection lifecycle & environment tags.
  - Object Explorer multi-connection tree navigation.
  - Collection Workspace (Documents, Indexes, Schema Analyzer).
  - Action Modals (Backup, Restore, Export, Import).
  - Production Guard typed confirmation gates.
  - Settings hub and CLI engine management.
  - Large dataset virtualization and 60 FPS scrolling stability.

## 2. Test Execution Commands

### 2.1. Run Rust Backend Tests
```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

### 2.2. Run Rust Linter & Formatter
```bash
# Clippy verification (zero warnings allowed)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings

# Rust formatting check
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

### 2.3. Run Frontend Build & Typecheck
```bash
npm run build
```

### 2.4. Run Playwright E2E Suites
```bash
# Start MongoDB test container
docker compose up -d

# Execute Playwright E2E tests
npm run test:e2e
```

## 3. Related Documents

- [Playwright Test Plan](./playwright-test-plan.md)
- [Development Setup](./setup.md)
- [Engineering Guidelines](./guidelines.md)
