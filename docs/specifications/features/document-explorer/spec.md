# Feature: Document Explorer and CRUD Operations

## 1. Overview

### Purpose
Provide an intuitive, fast, and multi-modal document inspection and editing workspace, allowing users to query, filter, sort, view, create, edit, duplicate, and delete MongoDB documents.

### Background
Inspecting documents in various shapes and schemas is the primary day-to-day task when administering MongoDB databases. Users need flexible view modes (tabular view for flat records, hierarchical tree view for nested structures, and raw JSON view for copy-pasting and direct manipulation), coupled with an expressive query bar.

### Status
Implemented

## 2. Scope

### In Scope
- Multi-modal viewing engine:
  - **Table View**: Flat spreadsheet-style table with pinned `_id` column, resizable columns, and BSON type badges.
  - **Tree View**: Interactive expandable JSON node hierarchy with in-place value editing.
  - **Raw JSON View**: Monospaced text editor with syntax highlighting, automatic indentation, and validation.
- Query Bar:
  - Filter input supporting MongoDB query operators (`$eq`, `$gt`, `$in`, `$regex`, `$or`, etc.).
  - Sort, Project, Limit, and Skip inputs.
  - Recent query history and query bookmarking.
- Full Document CRUD:
  - Single and bulk document insertions.
  - In-place document editing and modal-based JSON editing.
  - Document duplication and deletion.
  - Fast clipboard export (as JSON, ObjectId string, or Python/Node dict).

### Out of Scope
- Direct binary file upload for GridFS storage (planned for later release).

## 3. Actors and Permissions
- **Actor:** Developer / Data Engineer / DBA.
- **Permissions:** Read and write permissions corresponding to the authenticated MongoDB database user account.
- **Restrictions:** Destructive deletions on `Production` environments invoke Production Guard confirmation.

## 4. Functional Requirements

### FR-DOC-001: Query Execution and Pagination
- **Description:** Executes user-defined queries against the selected collection with limit and pagination controls.
- **Preconditions:** Connected to a valid database with an active collection selected.
- **Expected Behavior:** Parses the query filter, sort, project, and limit parameters. Dispatches the query via `mongosh` subprocess. Returns parsed JSON results with pagination metadata (page, total count, elapsed time).
- **Failure Behavior:** If the filter contains syntax errors or invalid operators, display inline error messages identifying the character position of the syntax issue.
- **Acceptance Criteria:**
  - AC-DOC-01: Displays query results matching the filter criteria.
  - AC-DOC-02: Applies sort orders (ascending `1`, descending `-1`) and field projections correctly.
  - AC-DOC-03: Displays total execution time in milliseconds.

### FR-DOC-002: Multi-Modal Data Views
- **Description:** Synchronizes data across Table, Tree, and Raw JSON view modes.
- **Preconditions:** Query results loaded.
- **Expected Behavior:**
  - Table View: Renders top-level document fields as columns, pinning `_id` on the left. Displays BSON type chips (e.g., `ObjectId`, `Date`, `Number`, `Array`).
  - Tree View: Renders expandable nested objects with inline primitive value editing.
  - Raw JSON View: Renders formatted JSON text with syntax highlighting and line numbers.
- **Failure Behavior:** When switching between view modes, active selections and scroll positions are retained where applicable.
- **Acceptance Criteria:**
  - AC-DOC-04: Users can switch views without triggering a new database round-trip.
  - AC-DOC-05: Columns in Table View support drag-to-resize.

### FR-DOC-003: Document Creation and Updates
- **Description:** Enables insertion of new documents and updates to existing documents.
- **Preconditions:** Collection selected.
- **Expected Behavior:** Validate JSON syntax before dispatching write commands to the database. Generate a new `ObjectId` automatically if `_id` is omitted in newly inserted documents.
- **Failure Behavior:** Display database validation errors (such as duplicate key errors on unique indexes) in a dedicated alert box.
- **Acceptance Criteria:**
  - AC-DOC-06: Inserts valid single or bulk documents into the collection.
  - AC-DOC-07: Updates selected document fields and reflects changes immediately in the current view.

### FR-DOC-004: Safe Document Deletion
- **Description:** Removes selected documents from the collection.
- **Preconditions:** One or more documents selected.
- **Expected Behavior:** Display a confirmation dialog detailing the count of documents to be deleted. Execute deletion command upon confirmation.
- **Failure Behavior:** Prevent deletion if confirmation is cancelled.
- **Acceptance Criteria:**
  - AC-DOC-08: Deletes targeted document by `_id`.
  - AC-DOC-09: Refreshes view and decrements collection document count badge.

### FR-DOC-005: Large Dataset Scalability and Virtualized Scrolling
- **Description:** Renders and scrolls massive document collections smoothly using virtualized viewport buffering.
- **Preconditions:** Collection with 1,000+ records selected.
- **Expected Behavior:** Renders visible table rows dynamically while keeping overall DOM node count strictly under 1,500 elements. Sustains a 60 FPS scrolling frame rate during rapid vertical and horizontal navigation.
- **Failure Behavior:** If pagination limits are increased to 500+ documents, viewport scrolling remains fluid without browser stuttering or memory spikes.
- **Acceptance Criteria:**
  - AC-DOC-10: Maintains 60 FPS scrolling and bounds active DOM nodes below 1,500 elements when viewing large datasets.
  - AC-DOC-11: Keeps the primary key (`_id`) column rigidly pinned during both vertical and horizontal scroll gestures.

### FR-DOC-006: Comprehensive Dataset Pagination
- **Description:** Provides full-featured pagination navigation across datasets of any size.
- **Preconditions:** Collection loaded.
- **Expected Behavior:**
  - Displays total document count, current page, and total pages (e.g. `Page 1 of 100`).
  - Navigation controls: First Page (`|<`), Previous (`<`), Next (`>`), and Last Page (`>|`).
  - Page size selector allowing 20, 50, 100, 200, and 500 documents per page.
  - Jump to page input allowing direct navigation to any page number.
- **Acceptance Criteria:**
  - AC-DOC-12: Correctly paginates across 5,000+ records and updates query results immediately upon page change.
  - AC-DOC-13: Disables previous/first buttons on page 1 and next/last buttons on the final page.

### FR-DOC-007: Multi-Record Selection and Inline Batch Actions
- **Description:** Allows selecting multiple documents in Table View for batch operations with actions embedded directly in the pagination toolbar.
- **Preconditions:** Table View active.
- **Expected Behavior:**
  - Column 1 contains checkboxes for individual row selection and a header checkbox supporting Select All / Deselect All / Indeterminate states.
  - When one or more rows are selected, render action triggers directly within the pagination toolbar on the same horizontal row (avoiding vertical layout pushing).
  - Batch action triggers: Copy IDs (copies JSON array of IDs), Copy JSON (copies full JSON of selected documents), Delete Selected, and Deselect All.
- **Acceptance Criteria:**
  - AC-DOC-14: Selecting rows renders action triggers inline with pagination controls without shifting table content.
  - AC-DOC-15: Copy JSON copies full document objects to the system clipboard.

### FR-DOC-008: Table Column Sorting and Context Menu Actions
- **Description:** Provides column header click-to-sort toggles and row-level context menus replacing dedicated inline action columns.
- **Preconditions:** Table View active.
- **Expected Behavior:**
  - Clicking any column header toggles sort between ascending (`1`), descending (`-1`), and none (`0`), updating query sort and resetting page to 1.
  - Right-clicking any table row displays a custom context menu with options: Edit Document, Copy Document JSON, Copy Document ID, and Delete Document.
  - Pin both the selection Checkbox column (`left: 0`) and the `_id` column (`left: 40px`) during horizontal scrolling.
- **Acceptance Criteria:**
  - AC-DOC-16: Column headers toggle sorting and execute sorted queries.
  - AC-DOC-17: Row right-click opens context menu with document inspection and mutation actions.
  - AC-DOC-18: Checkbox and `_id` columns remain pinned side-by-side during horizontal scrolling.
  - AC-DOC-14: Tracks multi-selection state accurately across row clicks and select-all toggles.
  - AC-DOC-15: Batch deletion prompts safety confirmation and deletes all selected documents in a single round-trip.

### FR-DOC-008: Non-Distorting Inline Cell Editing
- **Description:** In-place cell editing in Table View without altering column widths or shifting surrounding elements.
- **Preconditions:** Table cell double-clicked.
- **Expected Behavior:**
  - Preserves exact column width; editor is contained within the cell's boundaries.
  - Provides inline action triggers: Save (`✓`) and Cancel (`✕`).
  - Pressing `Escape` or clicking outside dismisses edit mode without modifying data.
  - Pressing `Enter` or clicking Save commits the modification.
- **Acceptance Criteria:**
  - AC-DOC-16: Editing a cell does not widen the column or shift adjacent layout elements.
  - AC-DOC-17: Clicking outside cancels edit mode cleanly without mutation.

### FR-DOC-009: Free-Text Selection and Granular Copying
- **Description:** Enables native text selection across JSON, Tree, and Table views.
- **Preconditions:** Document view rendered.
- **Expected Behavior:** Applies `select-text` styling so users can highlight any field key, value, or substring and copy via Ctrl+C. Table cells provide one-click cell value copy triggers.
- **Acceptance Criteria:**
  - AC-DOC-18: Text in Raw JSON, Tree View, and Table cells can be highlighted and copied natively.

## 5. Business Rules
### BR-DOC-001: Pinned Primary Key
- The `_id` field remains pinned to the leftmost position in Table View and is marked read-only during document updates.

### BR-DOC-002: Data Type Preservation
- Extended JSON / EJSON conventions preserve BSON types (e.g., `{"$oid": "..."}`, `{"$date": "..."}`).

## 6. User & System Flows

### Query Flow
1. User types `{ "status": "active", "age": { "$gte": 21 } }` into QueryBar.
2. User clicks "Run Query" (`Ctrl + Enter`).
3. Frontend validates JSON syntax and calls Tauri command `execute_query`.
4. Rust backend executes query via `mongosh` subprocess with `--json=relaxed`.
5. Frontend receives document array and populates the active view mode.

### Document Edit Flow (Tree View)
1. User expands an object node in Tree View.
2. User double-clicks a scalar string value.
3. Input field appears inline with current value prefilled.
4. User updates value and presses `Enter`.
5. System prompts for update confirmation and sends patch command to backend.
6. Backend applies update by `_id` and returns updated document.

## 7. Data Requirements
- **QueryParameters Entity:**
  - `collection`: String.
  - `filter`: String (JSON).
  - `sort`: Optional String (JSON).
  - `projection`: Optional String (JSON).
  - `limit`: Integer (default 50, maximum 1000).
  - `skip`: Integer (default 0).
- **QueryResult Entity:**
  - `documents`: Array of parsed BSON/JSON objects.
  - `total_count`: Integer.
  - `execution_time_ms`: Integer.

## 8. API & Integration
- **Tauri Commands:**
  - `execute_query(params: QueryParameters) -> Result<QueryResult, String>`
  - `insert_document(collection: String, document: String) -> Result<String, String>`
  - `update_document(collection: String, id: String, patch: String) -> Result<String, String>`
  - `delete_documents(collection: String, ids: Vec<String>) -> Result<u64, String>`

## 9. Security & Privacy
- Input parameters are escaped and passed via structured evaluation APIs to prevent script injection into shell subprocesses.

## 10. Edge Cases
- Extremely large documents (>16MB BSON limit or deeply nested >100 levels): Tree view limits initial expansion depth to 5 levels to preserve UI rendering performance.
- High document volume pagination: UI uses virtualized lists (virtual scrolling) in Table View to maintain smooth 60 FPS scrolling.

## 11. Testing Requirements
- Unit tests validating query parameter stringification and JSON parsing.
- Component tests for Table View column resizing and Tree View node toggling.
- Integration tests executing real queries against a local MongoDB container.

## 12. Open Questions and Assumptions
### Confirmed Decisions
- UI provides three view modes: Table, Tree, and Raw JSON.
- Queries execute via `mongosh --json=relaxed`.

### Assumptions
- Modern browser webview handles virtualized lists up to 1,000 documents per page smoothly.

### Open Questions
- None.

## 13. Implementation Notes
- Frontend: Monaco Editor / CodeMirror for Raw JSON view, `@tanstack/react-table` for virtualized Table View.
- Files: `src/components/DocumentExplorer/QueryBar.tsx`, `src/components/DocumentExplorer/TableView.tsx`, `src/components/DocumentExplorer/TreeView.tsx`, `src/components/DocumentExplorer/RawJsonView.tsx`.

## 14. Related Documents
- [System Architecture Overview](../../architecture/system-overview.md)
- [Connection Manager Specification](../connection-manager/spec.md)
- [Product Requirements](../../product/requirements.md)
