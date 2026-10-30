---
name: create-docs
description: Analyze user requirements, existing documentation, and codebase to create or update accurate software documentation. Use when defining a new feature, clarifying requirements, resolving documentation gaps, or updating specifications before implementation.
---

# Create Documentation

## Objective

Produce clear, consistent, and verifiable software documentation that accurately describes intended system behavior and provides sufficient context for implementation by an AI coding agent or human developer.

Documentation must be grounded in confirmed user requirements, verified codebase observations, and established architectural decisions. 

**Never invent requirements, assume business logic without confirmation, or silently resolve material ambiguities.**

---

## Inputs

- **User Request:** Feature request, enhancement, refactor, bug report, or design prompt.
- **Existing Documentation (`docs/`):**
  - Product specs: `docs/product/`
  - Architecture & ADRs: `docs/architecture/`
  - Feature specifications: `docs/specifications/`
  - Engineering guidelines: `docs/engineering/`
  - Project management: `docs/project/`
- **Codebase Context:** Source code, test suites, schemas, API contracts, dependencies, and configuration.

---

## Core Principles

1. **No Invented Requirements:** If an important requirement or edge case is unspecified (e.g., account linking behavior, data retention, failure modes), do not assume a default without confirmation.
2. **Strict Information Classification:** Always categorize information into:
   - `Confirmed`: Explicitly verified by the user or approved specification.
   - `Observed`: Verified directly from code, database schema, or tests.
   - `Inferred`: Tentative deductions that must be verified before relying upon them.
   - `Open Question`: Critical gaps requiring human input.
3. **Code as Evidence, Not Absolute Truth:** The existing code reflects what the system *currently does*, not necessarily what it *should do*. Differentiate implementation bugs from intended behavior.
4. **Targeted, Non-Destructive Edits:** Modify only the documentation sections directly related to the change. Preserve unrelated specs and historical decisions.
5. **Efficiency in Clarifications:** Check codebase, configuration, and existing docs before asking the user. When asking, batch questions, explain trade-offs, and suggest reasonable options.
6. **Strict Relative Links (Portability Rule):** ALL links inside repository documentation files (`docs/**/*.md`, `README.md`) MUST strictly use relative markdown paths (e.g., `./product/requirements.md` or `../../architecture/system-overview.md`). NEVER write local machine absolute paths, drive letters (`C:\`), or `file:///` URIs inside files saved to the repository. Absolute machine paths break whenever the project is cloned, moved, or opened in CI or on another developer's machine.

---

## Workflow

```text
User Request
     │
     ▼
Step 1: Understand the Request
     │
     ▼
Step 2: Discover Existing Documentation
     │
     ▼
Step 3: Inspect Relevant Codebase
     │
     ▼
Step 4: Analyze Gaps, Conflicts, and Unknowns
     │
     ├── Critical information missing ──► Ask User (Batch & Options)
     │                                           │
     │◄──────────────────────────────────────────┘
     ▼
Step 5: Clarify Requirements & Scope
     │
     ▼
Step 6: Select Documentation Targets
     │
     ▼
Step 7: Draft or Update Documents (Using Standard Templates)
     │
     ▼
Step 8: Validate Documentation Integrity
     │
     ▼
Step 9: Save, Update Indexes, and Report
```

### Step 1: Understand the Request
Analyze the prompt to identify:
- The core problem and business goal.
- Target actors/users and permissions.
- Expected behavior under normal and exceptional conditions.
- Scope boundaries: what is in-scope and explicitly out-of-scope.
- Constraints (performance, security, backward compatibility).

### Step 2: Discover Existing Documentation
Check `docs/README.md` first. Locate relevant documents across:
- `docs/product/` (requirements, product overview, glossary).
- `docs/architecture/` (system context, components, data model, decisions).
- `docs/specifications/` (existing feature specs).
- `docs/engineering/` (coding conventions, testing, security).

*Rule:* Reuse and update existing documents where possible instead of creating duplicates.

### Step 3: Inspect the Codebase
Search and inspect relevant source files, existing tests, API endpoints, schema definitions, and configurations.
- Identify current implementation patterns and conventions.
- Detect differences between current code and existing documentation.
- Assess potential regression risks and affected modules.

### Step 4: Analyze Gaps and Conflicts
Build an internal checklist:
- Classify unresolved questions into:
  - **Blocking:** Prevents safe specification or implementation (e.g., security logic, data migration policy).
  - **Non-blocking:** Minor design choices that can be documented as explicit assumptions and deferred.
- Check codebase/docs first. If a blocking question cannot be answered from existing evidence, prepare targeted questions for the user.

### Step 5: Clarify Requirements
When user clarification is needed:
- State what is already known from code/docs.
- Present the specific ambiguity and the implications.
- Offer viable options (with pros and cons) when appropriate.
- Record the confirmed answers under `Confirmed Decisions`.

### Step 6: Select Documentation Targets
Choose the minimum set of files to update:
- Product-wide requirements: `docs/product/requirements.md`
- Architecture or cross-cutting component designs: `docs/architecture/`
- Significant technical decisions: `docs/architecture/decisions/XXXX-<title>.md` (ADR)
- Feature behavior: `docs/specifications/features/<feature-name>/spec.md`
- Feature test cases: `docs/specifications/features/<feature-name>/test-cases.md`
- Engineering setup or guidelines: `docs/engineering/`

### Step 7: Draft or Update Documents
Draft the specification using the standard templates provided below. Ensure requirements use stable identifiers:
- `FR-001`: Functional Requirements.
- `BR-001`: Business Rules.
- `AC-001`: Acceptance Criteria.

#### Portable Relative Link Policy (Mandatory for all documentation files):
- **ALWAYS use relative markdown links:** e.g., `[System Overview](../architecture/system-overview.md)` or `[Requirements](./requirements.md)`.
- **STRICTLY PROHIBITED in saved files:**
  - `file:///` schemes.
  - Windows drive letters (e.g., `c:\`, `D:\`).
  - Absolute OS paths (e.g., `/Users/...`, `/home/...`).
- *Clarification:* While the AI Assistant may use clickable `file:///` links in interactive chat messages if required by the IDE communication style, **files saved to the repository must NEVER contain machine-specific absolute paths.**

### Step 8: Validate Documentation Integrity
Perform a verification pass on the written documentation:
- [ ] Every requirement is observable and testable.
- [ ] Acceptance criteria map directly to requirements.
- [ ] Terminology aligns with `docs/product/glossary.md`.
- [ ] No contradictions with approved architecture decisions or existing specs.
- [ ] Referenced files, endpoints, and entities exist or are explicitly planned.
- [ ] Open questions and assumptions are explicitly tagged.
- [ ] Document status is accurately labeled.
- [ ] **No machine-specific absolute paths or `file:///` URIs:** All markdown links use portable relative paths.

### Step 9: Save, Update Indexes, and Report
- Write the changes to the appropriate file paths.
- Update `docs/README.md` and feature index files if new documents were added.
- Provide a concise summary to the user:
  - Files created or updated.
  - Key confirmed requirements and business rules.
  - Assumptions made and open questions remaining.
  - Specification status (`Draft` vs `Ready for Implementation`).

---

## Standard Templates

### 1. Feature Specification Template
Location: `docs/specifications/features/<feature-name>/spec.md`

```markdown
# Feature: <Feature Name>

## 1. Overview
### Purpose
Why does this feature exist?

### Background
What problem does it solve?

### Status
Draft | Ready for Implementation | Implemented | Deprecated

## 2. Scope
### In Scope
- ...

### Out of Scope
- ...

## 3. Actors and Permissions
- Actor: ...
- Permissions: ...
- Restrictions: ...

## 4. Functional Requirements
### FR-001: <Requirement Name>
- **Description:** ...
- **Preconditions:** ...
- **Expected Behavior:** ...
- **Failure Behavior:** ...
- **Acceptance Criteria:**
  - AC-001: ...
  - AC-002: ...

## 5. Business Rules
### BR-001: <Rule Name>
- **Description:** ...

## 6. User & System Flows
### Main Flow
1. ...
2. ...

### Alternative Flows
- ...

### Error Flows
- ...

## 7. Data Requirements
- Entities & Fields: ...
- Validation Rules: ...
- Persistence & Storage: ...

## 8. API & Integration
- Endpoints / Contracts: ...
- Dependencies: ...
- Auth: ...

## 9. Security & Privacy
- Access Control: ...
- Sensitive Data Handling: ...

## 10. Edge Cases
- ...

## 11. Testing Requirements
- Unit Tests: ...
- Integration Tests: ...
- Negative Cases: ...

## 12. Open Questions and Assumptions
### Confirmed Decisions
- ...

### Assumptions
- ...

### Open Questions
- ...

## 13. Implementation Notes
- Relevant modules: ...
- Blast radius / compatibility: ...
```

### 2. Architecture Decision Record (ADR) Template
Location: `docs/architecture/decisions/XXXX-<decision-title>.md`

```markdown
# ADR-XXXX: <Decision Title>

## Status
Proposed | Accepted | Superseded | Deprecated

## Context
What problem, constraint, or driver requires this decision?

## Decision
What approach, architecture, or technology was selected?

## Alternatives Considered
- **Option A:** Pros / Cons
- **Option B:** Pros / Cons

## Consequences
### Positive
- ...

### Negative / Trade-offs
- ...

## Related Documents
- ...
```

---

## Specification Status Lifecycle

| Status | Meaning | Permitted Agent Action |
|---|---|---|
| `Draft` | Incomplete, pending clarification, or unconfirmed blocking questions. | Analyze, inspect code, ask clarifying questions. **DO NOT implement code.** |
| `Ready for Implementation` | Requirements, acceptance criteria, and technical approach are clear and verified. | Proceed to `implement-feature`. |
| `Implemented` | Code and tests have been completed, verified, and synchronized with docs. | Verify regressions, review, or maintain. |
| `Deprecated` | Specification is obsolete. | Do not use as basis for new features unless re-approved. |

---

## Completion Criteria

The documentation task is complete when:
- Requirements and scope are clearly defined.
- Blocking ambiguities are resolved and confirmed by the user.
- Documentation targets are updated using standard templates and stable identifiers (`FR`, `BR`, `AC`).
- Document indexes (`docs/README.md`) are updated.
- Specification status is explicitly marked.

---

## Constraints

- **Do NOT implement code** as part of this skill.
- **Do NOT guess or invent** business rules, access control, or database structures.
- **Do NOT silently alter** existing approved requirements or ADRs.
- **Do NOT mark a specification `Ready for Implementation`** if blocking ambiguities remain.
- **Do NOT use machine-specific absolute paths or `file:///` URIs** in any saved repository documentation. All links must be relative.
