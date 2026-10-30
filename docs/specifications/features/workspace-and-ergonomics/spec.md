# Feature: Workspace Ergonomics, Object Explorer, and Developer Productivity Suite

## 1. Overview

### Purpose
Establish a high-density, professional developer workspace combining a multi-connection Object Explorer, tabbed parallel workspaces, in-place table data manipulation, visual query performance profiling, collection index management, schema analysis, and non-blocking action modals.

### Background
Benchmarking against established database management suites (NoSQLBooster, MongoDB Compass, Studio 3T) demonstrates that operational velocity relies on three foundational capabilities:
1. Navigating multiple database connections concurrently without switching global views.
2. Interacting directly with data in place (such as editing table cells inline rather than opening nested modal editors).
3. Invoking operational tasks (backup, restore, export, import) through contextual action overlays that preserve active queries and filters.

### Status
Ready for Implementation

## 2. Scope

### In Scope
- **Object Explorer Tree**:
  - Simultaneous multi-connection profile tree rendering (`Cluster > Database > Collections > Indexes/Users`).
  - Search filter input for dynamic tree filtering.
  - Native-style contextual menus (right-click) for clusters, databases, and collections.
- **In-Place Inline Table Cell Editing**:
  - Double-clicking any scalar table cell activates an inline input field.
  - Pressing `Enter` commits updates directly to the database via `updateOne` (with primary key `_id` protected).
  - Pressing `Escape` cancels edits.
- **Multi-Tab Workspace**:
  - Tab bar supporting parallel collection documents, index managers, schema analyzers, and shell scripts.
  - Preservation of active query filters, sort rules, and scroll positions across tab switches.
- **Query History & Bookmarks**:
  - History dropdown retaining the last 20 executed queries for immediate re-run.
  - Named query bookmarks with 1-click execution.
- **Visual Explain Plan & Query Profiler**:
  - Integration of `explain("executionStats")` visualizer.
  - Prominent visual alerts for full collection scans (`COLLSCAN`) versus index scans (`IXSCAN`).
  - Execution time metrics, scanned documents count, and returned documents count.
- **Collection Index Manager**:
  - Listing all collection indexes with key directions, unique/sparse flags, and memory footprint.
  - Form for single-field, compound, and TTL index creation.
  - Safe index dropping with protection for primary key `_id_`.
- **Polymorphic Schema Analyzer**:
  - Document sampling engine analyzing field presence percentages.
  - Visual breakdown of detected BSON types (`String`, `Number`, `ObjectId`, `Array`, `Date`, `Object`).
- **Action Modals with Storage Integration**:
  - Modal-based Backup (Dump), Restore, Export, and Import wizards.
  - Managed local storage path (`%LOCALAPPDATA%\Mongox\backups`) with native OS File Explorer open button.
  - 1-click selection from detected backup archives on disk.
  - Native file browser integration.

### Out of Scope
- Multi-user real-time collaborative editing.
- Automatic cloud bucket uploads (local filesystem targets).

## 3. Actors and Permissions
- **Actor:** Database Administrator, Backend Developer, QA Engineer.
- **Permissions:** Governed by authenticated MongoDB user credentials.
- **Restrictions:** Destructive operations (drop collection, drop database, bulk deletion, restore with drop) on connections tagged as `Production` trigger Production Guard verification.

## 4. Functional Requirements

### FR-ERG-001: Multi-Connection Object Explorer
- **Description:** The left navigation panel displays all saved database connections simultaneously in an expandable tree.
- **Preconditions:** One or more connection profiles configured.
- **Expected Behavior:** Each connection node can be expanded to reveal databases and collections. Expanding a connection interrogates database metadata without disconnecting or collapsing adjacent connections.
- **Acceptance Criteria:**
  - AC-ERG-01: Displays all connection profiles with environment status badges (`PROD`, `STAG`, `DEV`, `LOCAL`).
  - AC-ERG-02: Allows concurrent expansion of multiple connection trees.
  - AC-ERG-03: Real-time search filter filters tree nodes instantly.

### FR-ERG-002: Contextual Menu System
- **Description:** Right-clicking any tree node opens a contextual action menu tailored to the entity type.
- **Expected Behavior:**
  - Right-clicking Collection: Open Documents, View Indexes, Analyze Schema, Backup Collection, Export Data, Import Data, Drop Collection.
  - Right-clicking Database: New Collection, Backup Database, Restore Archive, Database Stats, Drop Database.
  - Right-clicking Connection: Test Ping, Edit Profile, Open Shell, Delete Profile.
- **Acceptance Criteria:**
  - AC-ERG-04: Displays contextual menu at cursor coordinates upon right-click.
  - AC-ERG-05: Clicking outside or pressing `Escape` dismisses the menu.

### FR-ERG-003: In-Place Inline Table Cell Editing
- **Description:** Users can edit scalar document fields directly inside the Table View without opening modal dialogs.
- **Preconditions:** Table View active with query results loaded.
- **Expected Behavior:** Double-clicking a cell converts it into an active input. Pressing `Enter` dispatches `update_document` with the modified value (excluding `_id`). Pressing `Escape` cancels the edit.
- **Acceptance Criteria:**
  - AC-ERG-06: Activates inline input upon double-click.
  - AC-ERG-07: Strips `_id` and saves updated value to MongoDB on Enter.
  - AC-ERG-08: Protects primary key `_id` cell from being edited.

### FR-ERG-004: Multi-Tab Workspace Session Manager
- **Description:** Central workspace supports multiple open tabs across different databases and collections.
- **Expected Behavior:** Opening a collection adds a tab. Switching between tabs preserves query filters, sort settings, and scroll positions. Tabs can be reordered or closed.
- **Acceptance Criteria:**
  - AC-ERG-09: Supports opening multiple parallel collection and query tabs.
  - AC-ERG-10: Retains query inputs and scroll positions when switching tabs.

### FR-ERG-011: Visual Query Profiler & Explain Plan Inspection
- **Description:** Visualizes MongoDB query execution plans, highlighting index usage and collection scans.
- **Preconditions:** Query formulated in Query Bar.
- **Expected Behavior:** Executes `db.collection.find(...).explain("executionStats")`. Displays visual summary badge: green `IXSCAN` when indexed, or red warning `COLLSCAN` when unindexed. Displays execution time, total documents examined, and documents returned.
- **Acceptance Criteria:**
  - AC-ERG-11: Renders execution stages, scanned document count, and execution time in milliseconds.
  - AC-ERG-12: Highlights full collection scans (`COLLSCAN`) with high-visibility warning indicators.

### FR-ERG-012: Query Bookmarks and Execution History
- **Description:** Allows saving and recalling frequently executed MongoDB queries.
- **Expected Behavior:** Star button saves current filter with a custom title. Clock button displays the 20 most recently executed queries. Selecting a query pre-fills the Query Bar.
- **Acceptance Criteria:**
  - AC-ERG-13: Retains last 20 queries in local storage.
  - AC-ERG-14: Allows saving, naming, and executing bookmarked queries.

## 5. Business Rules
### BR-ERG-001: Operational Context Preservation
- Invoking operational wizards (Backup, Restore, Export, Import) operates via modal dialogs and preserves all active workspace tabs.

### BR-ERG-002: Production Guard Protection
- Destructive commands triggered from tree context menus or workspaces on `Production` environments enforce typed confirmation.

## 6. User & System Flows

### Flow 1: In-Place Table Editing
1. User navigates to `orders` collection in Table View.
2. User double-clicks the `status` cell of an order.
3. Cell converts to text input with current value `"pending"` selected.
4. User types `"shipped"` and presses `Enter`.
5. Frontend calls `updateDocument(connId, db, col, docId, '{"status":"shipped"}')`.
6. Cell updates to `"shipped"` with subtle emerald success flash.

### Flow 2: 1-Click Restore from Managed Storage
1. User right-clicks `store_db` in Object Explorer and selects "Restore into Database".
2. `RestoreModal` opens and interrogates `%LOCALAPPDATA%\Mongox\backups`.
3. Modal displays detected archives list (e.g., `backup_store_db_2026-10-30.dump.gz`, 8.3 MB).
4. User clicks the archive row.
5. System pre-fills file path, verifies archive header, and displays database metadata.
6. User clicks "Run Restore" to initiate restoration.

## 7. Data Requirements
- **WorkspaceTab Entity:**
  - `id`: String.
  - `title`: String.
  - `type`: Enum (`Documents`, `Indexes`, `Schema`, `Console`).
  - `connection_id`: String.
  - `database`: String.
  - `collection`: String.
  - `filter_state`: QueryParams.
- **QueryBookmark Entity:**
  - `id`: String.
  - `title`: String.
  - `filter`: String.
  - `sort`: Optional String.
  - `projection`: Optional String.

## 8. API & Integration
- **Backend Commands:**
  - `list_indexes(connection_id, database, collection) -> Vec<IndexInfo>`
  - `create_index(req: CreateIndexRequest) -> String`
  - `drop_index(req: DropIndexRequest) -> String`
  - `list_backup_files() -> Vec<BackupFileInfo>`
  - `open_backup_directory() -> ()`
  - `get_default_backup_dir() -> String`
  - `explain_query(params: QueryParams) -> ExplainResult`

## 9. Security & Privacy
- In-place updates enforce payload sanitization, removing `_id` to prevent MongoDB immutable field violations.
- Child processes spawn with `CREATE_NO_WINDOW` on Windows to eliminate console flashing.

## 10. Related Documents
- [System Architecture Overview](../../architecture/system-overview.md)
- [ADR-0004: Ergonomic Workspace and Action Modals](../../architecture/decisions/0004-ergonomic-workspace-and-action-modals.md)
- [Document Explorer Specification](../document-explorer/spec.md)
- [Backup and Restore Specification](../backup-restore/spec.md)
