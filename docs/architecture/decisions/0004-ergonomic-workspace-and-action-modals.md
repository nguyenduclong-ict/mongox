# ADR-0004: Ergonomic Workspace, Multi-Connection Object Explorer, and Action Modals

## Status
Accepted

## Context
Initial iterations of Mongox partitioned administrative capabilities across top-level view tabs (Connections, Document Explorer, Backup & Restore, Export & Import, and Engine Console). Analysis of production developer workflows and comparative benchmarking against established MongoDB administration suites (NoSQLBooster, MongoDB Compass, Studio 3T) revealed several operational friction points:

1. **Fragmented Connection Management**: Viewing documents or executing actions required switching away from connection management, preventing operators from managing and cross-referencing multiple database clusters simultaneously.
2. **Context Disruption**: Launching operational tasks like data exports, database snapshots, or restorations via full-page tabs cleared active query states and navigation position.
3. **Manual File Handling**: Restoring archives and importing datasets required manual text entry of file paths rather than 1-click selection from managed local storage.
4. **Primary Real Estate Inefficiency**: Diagnostic CLI engine status occupied a primary workspace tab rather than being integrated into an application settings hub.

## Decision
We adopt the **Ergonomic Workspace Architecture**:

1. **Unified Multi-Connection Object Explorer**:
   - The primary left panel is converted into a hierarchical Object Explorer displaying all saved connection profiles simultaneously.
   - Operators can expand multiple connections concurrently (`Cluster > Database > Collections > Indexes/Users`).
   - Deep context actions (Backup, Restore, Export, Import, Drop) are accessible directly via right-click contextual menus and inline hover actions.

2. **Action Modals over Full-Page Navigation**:
   - Short-lived operational wizards (Database Dump/Backup, Archive Restoration, Data Export with Smart Masking, Data Ingestion) operate as focused **Action Modals** with backdrop blur overlays.
   - Operations execute in place without altering or resetting the active collection query tab.
   - Backups automatically save to managed application storage (`%LOCALAPPDATA%\Mongox\backups`) with 1-click "Open Folder in File Explorer" triggers.
   - Restores automatically discover and list existing `.dump.gz` archives on disk for 1-click restoration.

3. **Multi-Tab Workspace**:
   - The central workspace adopts a multi-tab bar supporting parallel document explorers, query scripts, and diagnostic tools across different databases.
   - Each tab maintains independent query filter strings, sort orders, and pagination states.

4. **Multi-Faceted Collection Workspaces**:
   - Selecting a collection provides immediate tabbed access to:
     - **Documents**: Query Bar, virtualized Table/Tree/Raw JSON views, and in-place inline editing.
     - **Indexes**: Visual index inspection, memory sizes, unique/sparse flags, and index creation/drop controls.
     - **Schema Analyzer**: Sampling-based polymorphic field distribution analysis.

5. **Centralized Settings Hub**:
   - Engine auto-provisioning status, tool re-download triggers, default storage locations, and query limits are consolidated into a dedicated `SettingsModal` (`⚙️`).

## Alternatives Considered

- **Single-Connection Dropdown Model (MongoDB Compass style)**:
  - *Strengths*: Simple interface with minimal sidebar density.
  - *Trade-offs*: Requires disconnecting and reconnecting when comparing collections across environments (e.g. Localhost vs Staging).

- **Full-Screen Wizard Pages**:
  - *Strengths*: Provides large surface area for multi-step configuration forms.
  - *Trade-offs*: Destroys active query context and forces users to re-enter filters upon returning to the document view.

## Consequences

### Positive
- Streamlines day-to-day database operations by keeping primary workspaces focused on data exploration.
- Eliminates manual typing of backup filenames through automated discovery in managed storage directories.
- Protects query state when launching data backups or exports.
- Enables simultaneous multi-cluster inspection matching commercial standards (NoSQLBooster and Studio 3T).

### Negative / Trade-offs
- Increased complexity in application state management to coordinate multi-tab lifecycles and background modal jobs.
- Requires robust context menu positioning and keyboard dismissal handlers.

## Related Documents
- [System Architecture Overview](../system-overview.md)
- [Workspace & Ergonomics Feature Specification](../../specifications/features/workspace-and-ergonomics/spec.md)
- [Document Explorer Specification](../../specifications/features/document-explorer/spec.md)
- [ADR-0003: Linear-Inspired Design System](./0003-linear-design-system.md)
