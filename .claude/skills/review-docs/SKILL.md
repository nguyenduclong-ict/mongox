---
name: review-docs
description: Audit project documentation for completeness, consistency, traceability, broken references, and potential drift from the implementation. Use after significant changes or when documentation quality needs review.
---

# Review Documentation

## Objective

Audit software documentation under `docs/` to identify defects, outdated descriptions, inconsistencies, broken references, and specification-to-code drift. Produce structured, actionable findings to maintain documentation as a trustworthy source of truth without silently altering business requirements.

---

## Inputs

- **Review Scope:** Target feature, recent git commit/diff, directory (`docs/specifications/`, `docs/architecture/`), or entire `docs/` tree.
- **Project Documentation (`docs/`):**
  - Index & navigation: `docs/README.md`
  - Product specs: `docs/product/`
  - Architecture & ADRs: `docs/architecture/`
  - Feature specifications: `docs/specifications/`
  - Engineering rules: `docs/engineering/`
- **Codebase Context:** Source code, test cases, schemas, APIs, and configuration files.

---

## Core Principles

1. **Code is Evidence, Not Authority:** When documentation and code disagree, do not immediately assume the documentation is outdated. The discrepancy may be an unapproved code change or an implementation defect.
2. **Actionable Classification:** Every issue must be classified by severity with clear evidence and concrete remediation recommendations.
3. **No Silent Rewrites:** Do not alter business rules, security expectations, or architectural decisions during a review without explicit user approval.
4. **Traceability Focus:** Ensure requirements (`FR-xxx`) trace cleanly to acceptance criteria (`AC-xxx`) and verified automated tests.
5. **Portability & Path Integrity:** All internal documentation links must use relative markdown paths. Hardcoded machine-specific absolute paths (`file:///`, `C:\`, `/Users/`, `/home/`) are defects that break repository portability across machines.

---

## Workflow

```text
Review Trigger / Scope Request
     │
     ▼
Step 1: Define Review Scope
     │
     ▼
Step 2: Inspect Target Documents & References
     │
     ▼
Step 3: Audit Documentation Quality & Traceability
     │
     ▼
Step 4: Cross-Check Codebase for Documentation Drift
     │
     ▼
Step 5: Generate Audit Report by Severity
     │
     ▼
Step 6: Apply Authorized Fixes (If Approved)
```

### Step 1: Define Review Scope
Identify the target boundary:
- **Feature Scope:** Specific feature spec and associated test cases (e.g., `docs/specifications/features/auth/`).
- **Diff / Change Scope:** Documents affected by recent code or spec changes.
- **Subsystem Scope:** Architecture documents, ADRs, or engineering guides.
- **Full Project Audit:** Comprehensive review across the entire `docs/` tree.

*Rule:* Prefer the narrowest scope that answers the user request to keep analysis focused.

### Step 2: Inspect Target Documents & References
Read all documents within scope and verify:
- All referenced relative markdown paths exist.
- No documents use machine-specific absolute paths or `file:///` URIs.
- Referenced code files, classes, components, or API endpoints exist in the codebase.
- Cross-references between product requirements, architecture decisions, and feature specs are valid.

### Step 3: Audit Documentation Quality & Traceability
Evaluate against the following criteria:
- **Completeness:** Are key sections (overview, actors, scope, error handling, security) present where relevant?
- **Clarity & Testability:** Are acceptance criteria (`AC-xxx`) unambiguous, measurable, and verifiable?
- **Portability:** Are all links written as relative paths (e.g. `./` or `../`)? Flag any `file:///` or drive paths.
- **Internal Consistency:** Do documents contradict each other (e.g., product requirements vs architectural decisions)?
- **Requirement Traceability:** Does each functional requirement (`FR-xxx`) have corresponding acceptance criteria (`AC-xxx`)?
- **Explicit Assumptions:** Are unresolved questions or assumptions explicitly tagged rather than stated as facts?

### Step 4: Cross-Check Codebase for Documentation Drift
Inspect relevant source code, tests, schemas, and configurations:
- Check if APIs match documented request/response payloads and routes.
- Check if database entities match documented schemas in `docs/architecture/data-model.md`.
- Check if tests actually test the documented acceptance criteria.
- Flag discrepancies between code behavior and documented behavior.

### Step 5: Generate Audit Report
Organize findings by severity level:

#### Severity Levels

- **Critical:** Security vulnerabilities, data integrity risks, or fundamental contradictions that could cause severe system failures or data loss.
- **High:** Major discrepancies between spec and code, missing acceptance criteria for core flows, or contradictory business logic that risks incorrect implementation.
- **Medium:** Significant omissions, unclear or untestable acceptance criteria, outdated technical details, missing edge-case handling, or **hardcoded local machine paths (`file:///`, `C:\`, `/Users/`) that break documentation portability**.
- **Low:** Broken document links, formatting issues, typos, or minor editorial inconsistencies.

#### Report Format

For each finding, provide:
```markdown
### [<Severity>] <Concise Issue Title>
- **Document:** `docs/.../spec.md#L45`
- **Related Code/Document:** `src/...` or `docs/...`
- **Description:** Clear explanation of the discrepancy, omission, or defect.
- **Evidence:** Concrete proof from docs or code analysis.
- **Recommended Remediation:** Actionable steps to resolve the issue.
```

### Step 6: Apply Authorized Fixes
- If the review was **informational only**, present the audit report and await user decision.
- If the user **authorizes remediation**:
  - Convert any non-portable machine-specific absolute paths or `file:///` URIs to valid relative markdown paths.
  - Fix low-risk defects (broken links, typos, missing index references).
  - Synchronize verified technical documentation with approved codebase reality.
  - For business rules or architectural changes, formulate proposals and ask for user confirmation before editing.

---

## Completion Criteria

The review task is complete when:
- All target documents in scope have been thoroughly examined.
- Cross-checking against codebase has been performed and documented.
- All defects and drift items are categorized by severity with evidence and recommendations.
- A structured report is presented to the user.
- Any authorized documentation fixes are applied and validated.

---

## Constraints

- **Do NOT silently rewrite** business requirements, security criteria, or architectural choices.
- **Do NOT assume code is correct** when it diverges from approved documentation.
- **Do NOT present unverified suspicions** as confirmed defects without citing evidence.
- **Do NOT modify codebase code** during a documentation review.
