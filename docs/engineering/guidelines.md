# Engineering Guidelines and Code Standards

This document establishes engineering conventions, code organization principles, and style standards for the Mongox codebase.

## 1. Project Organization

Maintain strict separation between the native Rust backend and the React frontend:

- `src-tauri/`: Native backend logic, OS integrations, process execution, credential persistence.
  - `src/main.rs`: Application entry point.
  - `src/lib.rs`: Tauri plugin configuration, command registration, and state setup.
  - `src/provisioner.rs`: Engine discovery, download, and integrity checks.
  - `src/process_runner.rs`: Subprocess spawning and asynchronous stream pipelines.
  - `src/connection.rs`: Profile management and OS keyring interaction.
  - `src/backup_service.rs`: Backup and restore orchestration.
  - `src/models.rs`: Shared data transfer objects (DTOs) with Serde serialization.
- `src/`: User interface and client-side application logic.
  - `components/`: UI view components organized by domain feature.
  - `hooks/`: Custom React state and lifecycle hooks.
  - `services/`: Tauri IPC invocation abstractions.
  - `types/`: TypeScript interface and enum definitions matching Rust models.
  - `styles/`: Global stylesheets and theme utility definitions.

## 2. Rust Code Standards

### 2.1. Formatting and Linting
- Format code using standard `cargo fmt`.
- Address all warnings reported by `cargo clippy`:
  ```bash
  cargo clippy --all-targets --all-features -- -D warnings
  ```

### 2.2. Error Handling
- Use `Result<T, E>` for recoverable operations across internal functions.
- Map errors to user-friendly string messages at the Tauri command boundary (`Result<T, String>`).
- Avoid direct `.unwrap()` or `.expect()` calls in production runtime code; utilize `?` operator propagation or pattern matching.

### 2.3. Asynchronous Execution
- Execute blocking operations (disk I/O, heavy hashing, archive decompression) inside `tokio::task::spawn_blocking` to preserve Tauri IPC responsiveness.
- Utilize Tokio channels (`mpsc`, `broadcast`) for streaming child process output lines.

## 3. Frontend & TypeScript Standards

### 3.1. TypeScript Rules
- Enable strict type-checking in `tsconfig.json`.
- Define explicit interfaces and types for all component props, state values, and IPC payloads.
- Avoid the `any` type; use `unknown` with type guards when handling dynamic payloads.

### 3.2. React 19 Practices
- Write functional components with standard React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`).
- Keep business logic inside custom hooks (`useConnection`, `useProvisioning`) to decouple view rendering from data fetching.
- Manage memory by cleaning up event listeners in hook disposal return functions.

### 3.3. Linear-Inspired Design System & Styling
- Apply Tailwind CSS utility classes adhering to the Linear-inspired design tokens:
  - Canvas / Background (L0): `bg-[#08090A]` or `bg-[#0B0F17]`
  - Sidebar & Panels (L1): `bg-[#101216]` or `bg-[#12151B]`
  - Cards, Row Hover & Inputs (L2): `bg-[#181B22]` or `bg-[#1E232D]`
  - Modals & Command Palette (L3): `bg-[#1F2430]` with `backdrop-blur-md`
  - Hairline Borders: `border-[#1F2937]` or `border-white/[0.08]` (1px)
  - Primary Accent (Mongo Emerald): `text-[#10B981]`, `bg-[#10B981]`
  - Production Guard (Crimson): `text-[#EF4444]`, `bg-[#EF4444]`
- Enforce compact vertical spacing: Table rows maintain 32px to 36px height.
- Use Lucide icons consistently for visual actions and navigation cues.

### 3.4. Anti-AI-Slop & Utilitarian Cleanliness Standards (/design-taste-frontend)
- **Single Authoritative Action Triggers**: Exactly one trigger per operational intent. Duplicate Settings buttons (e.g. Header vs Sidebar vs Dashboard) are strictly prohibited. The Settings modal trigger resides exclusively in the Header.
- **Zero Meaningless Micro-Text & AI Filler**:
  - Remove decorative sub-eyebrows, technical stack flex badges ("Tauri v2 + Rust"), and fake precision footers ("JSON Strict / Relaxed EJSON").
  - Use terse, utilitarian engineering labels.
- **Quiet, Functional Empty States**: When zero connections are configured, render a clean, distraction-free interface without artificial metrics, marketing fluff, or simulated cards.
- **Zero Em-Dashes**: Em-dashes (`—`) are strictly banned across all UI components, buttons, and documentation. Use hyphens (`-`) or colons.
- **Purity of Intent (Anti-Test-Theater)**: UI interactions must drive authentic database operations. Simulating network successes without real database round-trips is strictly prohibited.

### 3.5. UI Ergonomics & Safety Confirmation Standards
- **Modal Backdrop Lightening**: Modals use a softened, airy dark blur (`bg-black/45 backdrop-blur-sm`) to keep background context discernible.
- **Scrollbar Layout Stability**: Containers rendering dynamically sized document tables apply `scrollbar-gutter: stable` to eliminate horizontal layout shifts when scrollbars appear.
- **Universal Safety Confirmation**: All destructive operations (single-document delete, bulk document delete, drop collection, drop database, and drop user) require interactive confirmation before execution. In production mode, confirmation requires typing the target entity name.

## 4. Git Commit Conventions

Adopt Conventional Commits format:

```text
<type>(<scope>): <short affirmative summary>

[optional detailed body]
```

Allowed types:
- `feat`: New user-facing feature or enhancement.
- `fix`: Bug fix.
- `docs`: Documentation creation or updates.
- `refactor`: Code restructuring without functional changes.
- `perf`: Performance optimization.
- `test`: Adding or updating test suites.
- `chore`: Build tool, dependency, or configuration updates.

## 5. Related Documents

- [Development Setup](./setup.md)
- [Security Guidelines](./security.md)
- [System Architecture Overview](../architecture/system-overview.md)
