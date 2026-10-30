---
name: implement-feature
description: Implement features, bug fixes, and other code changes using documented requirements as the source of intended behavior. Invoke create-docs when relevant specifications are missing, incomplete, outdated, or conflicting.
---

# Implement Feature

## Objective

Implement, modify, or fix software features strictly aligned with approved documentation, preserving system stability, maintaining project engineering conventions, and performing rigorous automated verification.

**Documentation is the single source of truth for intended behavior.** Implementation must never begin from ambiguous requirements or unverified assumptions.

---

## Inputs

- **User Request:** Change description, feature request, or bug report.
- **Specification & Requirements:** Relevant feature spec (`docs/specifications/features/<feature>/spec.md`), acceptance criteria, test cases.
- **Architecture Documentation:** Architecture overviews, component boundaries, and ADRs (`docs/architecture/`).
- **Engineering Guidelines:** Code conventions, testing setup, security rules (`docs/engineering/`).
- **Codebase Context:** Source code, existing unit/integration/e2e tests, schemas, and configurations.

---

## Core Principles

1. **Specification First Quality Gate:** Before altering any code, confirm that the relevant requirements are documented, unambiguous, and marked `Ready for Implementation`.
2. **Strict Scope Control (Anti-Scope-Creep):** Make minimal, cohesive changes directly necessary for the task. Do not perform unrelated refactoring, reformatting, or dependency changes without explicit user approval.
3. **Truth in Verification:** Never claim a test, build, or type check passed unless it was actually executed and the output confirmed. Always report real commands and results.
4. **Documentation Synchronization:** If implementation legitimately refines or updates approved behavior, keep documentation aligned. Do not rewrite documentation to excuse buggy or non-compliant code.
5. **Portability of Synchronized Docs:** When creating, modifying, or syncing documentation, all document links must use relative markdown paths (e.g. `../` or `./`). Never insert machine-specific absolute file paths or `file:///` URIs into the repository.

---

## Workflow

```text
User Request
     │
     ▼
Step 1: Understand & Classify the Request
     │
     ▼
Step 2: Find Relevant Documentation
     │
     ▼
Step 3: Evaluate Specification Readiness (Quality Gate)
     │
     ├── Missing / Incomplete / Outdated / Contradictory
     │              │
     │              ▼
     │         Invoke `create-docs` Workflow
     │              │
     │              └──────► Re-evaluate Gate
     │
     ▼
Step 4: Inspect Existing Implementation & Blast Radius
     │
     ▼
Step 5: Create a Focused Implementation Plan
     │
     ▼
Step 6: Implement Changes & Automated Tests
     │
     ▼
Step 7: Run Automated Verification (Tests, Types, Lints)
     │
     ▼
Step 8: Review Git Diff for Scope Leaks
     │
     ▼
Step 9: Synchronize Documentation & Status (`Implemented`)
     │
     ▼
Step 10: Report Results & Verification Evidence
```

### Step 1: Understand and Classify the Request
Classify the task type:
- **New Feature:** Substantial addition requiring full specification check.
- **Enhancement:** Update to existing feature behavior.
- **Bug Fix:** Resolving discrepancy between expected and actual behavior.
- **Refactoring:** Internal code cleanup without behavioral change.
- **Maintenance / Setup:** Dependency updates, configuration, or environment changes.

### Step 2: Find Relevant Documentation
Read `docs/README.md` and navigate to:
- Relevant feature spec in `docs/specifications/features/<feature-name>/spec.md`.
- Acceptance criteria (`AC-xxx`) and test cases (`test-cases.md`).
- Applicable ADRs in `docs/architecture/decisions/`.
- Project engineering conventions in `docs/engineering/code-conventions.md` and `testing.md`.

### Step 3: Evaluate Specification Readiness (Quality Gate)
Check whether the specification is:
- **Present:** Document exists and covers the requested change.
- **Clear:** Acceptance criteria (`AC-xxx`) are specific and testable.
- **Status:** Marked `Ready for Implementation` (not `Draft` or `Deprecated`).
- **Consistent:** Aligns with current architecture and observed codebase constraints.

**Action on Gate Failure:**
If documentation is missing, out-of-date, conflicting, or incomplete:
1. **Pause code implementation immediately.**
2. Switch to the `create-docs` workflow.
3. Clarify questions with the user and obtain approval for the spec.
4. Only return to implementation once the specification is marked `Ready for Implementation`.

*(Exception: For small bug fixes where intended behavior is already completely clear from existing tests/specs, verify the existing criteria before coding).*

### Step 4: Inspect Existing Implementation
- Trace affected components, call chains, and module dependencies.
- Inspect existing tests covering the affected areas.
- Identify regression risks, edge cases, and backward compatibility constraints.
- Determine necessary schema migrations or configuration changes.

### Step 5: Create an Implementation Plan
Formulate a concise, concrete plan:
- Target files and functions to modify or create.
- New unit/integration tests to add.
- Execution order of steps.
- Verification checks to run.
*(Note: If the change introduces architectural changes, breaking API modifications, or data migrations, present the plan for user confirmation first).*

### Step 6: Implement the Change
- Adhere strictly to the approved specification and project coding conventions.
- Implement business logic satisfying all relevant `FR-xxx` and `BR-xxx`.
- Write or update tests covering every acceptance criterion (`AC-xxx`), including edge cases and error flows.
- Maintain defensive validation, error handling, and security constraints.
- Avoid introducing unnecessary dependencies or modifying unrelated modules.

### Step 7: Verify the Implementation
Execute all applicable automated checks:
- **Unit / Integration / E2E Tests:** Run targeted test suites and regression tests.
- **Type Checking:** Verify types (e.g., `tsc`, `mypy`, language compiler).
- **Linter & Formatter:** Ensure conformity with style guides.
- **Build / Packaging:** Verify the build passes without errors.

*Rule:* If tests fail, analyze the root cause. Distinguish between newly introduced bugs and pre-existing failures. If a required test environment cannot be run, explicitly disclose the verification gap.

### Step 8: Review the Diff
Inspect git diff (`git diff` or file comparisons) before declaring completion:
- Verify no extraneous files were changed or committed.
- Verify no temporary debug code, hardcoded credentials, or console logs remain.
- Ensure all intended acceptance criteria are satisfied in the diff.
- Verify no hardcoded local machine paths (such as `file:///` or drive letters `C:\`) were introduced into docs or comments.

### Step 9: Synchronize Documentation
- Update the feature specification status from `Ready for Implementation` to `Implemented`.
- If implementation revealed necessary minor design adjustments approved during development, synchronize `docs/specifications/` and relevant architecture docs using strictly relative paths.
- Update `docs/project/known-issues.md` or `roadmap.md` if applicable.
- Never alter requirements simply to make a failing implementation look acceptable.

### Step 10: Report Results
Provide a clear, evidence-based report:
- **Summary of Changes:** What was implemented and which files were changed.
- **Requirements Satisfied:** List of `FR-xxx` and `AC-xxx` addressed.
- **Verification Evidence:** Exact test commands run, tests passed, and test output summary.
- **Documentation Updated:** List of modified documentation files.
- **Known Limitations:** Any edge cases, deferred items, or residual risks.

---

## Completion Criteria

An implementation task is complete ONLY when:
- The implementation strictly satisfies the approved specification.
- Automated tests pass and verification commands succeed with output documented.
- The diff has been reviewed to ensure zero scope creep.
- Relevant documentation status is synchronized to `Implemented`.
- Any remaining limitations or risks are transparently reported.

---

## Constraints

- **Do NOT write code** when material requirements are ambiguous, undocumented, or in `Draft`.
- **Do NOT guess or fabricate** business requirements to work around doc gaps.
- **Do NOT refactor unrelated files** or rewrite coding styles outside the task scope.
- **Do NOT falsify test results** or claim tests passed without executing them.
- **Do NOT modify specifications** to conceal bugs or incomplete implementations.
- **Do NOT insert machine-specific absolute paths or `file:///` URIs** into documentation or repository files.
