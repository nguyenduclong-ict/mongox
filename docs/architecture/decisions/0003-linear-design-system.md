# ADR-0003: Adoption of Linear-Inspired Design System

## Status
Accepted

## Context
Mongox is a desktop administration client for MongoDB engineered for speed, technical precision, and modern aesthetics. Database administrators and software engineers interact with dense data sets (BSON hierarchies, schema collections, indices, real-time query metrics) over extended working sessions. 

The application user interface requires:
1. High information density with clear visual hierarchy.
2. A cohesive dark-mode design system with crisp contrast and subtle surface elevation.
3. Rapid keyboard-first navigation patterns including a global Command Palette (`Ctrl + K`).
4. Micro-interactions and transitions with sub-150ms latency.

## Decision
We adopt the **Linear-inspired Design System** (Linear.app aesthetic) as the foundational UI/UX framework for Mongox.

Key characteristics applied to Mongox:
1. **Multi-Tier Surface Elevation**:
   - `L0 Canvas (Background)`: `#08090A` / `#0B0F17` (Deep Obsidian).
   - `L1 Panels (Sidebar, Header, Main Panels)`: `#101216` / `#12151B`.
   - `L2 Surface (Cards, Row Hovers, Popovers)`: `#181B22` / `#1E232D`.
   - `L3 Modals (Dialogs, Command Palette)`: `#1F2430` with backdrop blur (`backdrop-blur-md bg-black/60`).
2. **Hairline Precision Borders**:
   - 1px borders using muted slate/zinc tones (`#1F2937` or `rgba(255, 255, 255, 0.08)`) to delineate functional boundaries.
3. **Accent Harmonization**:
   - Primary Accent: MongoDB Emerald (`#10B981` / `#00ED64`) for active tabs, primary actions, and confirmed states.
   - Danger Accent: Crimson (`#EF4444`) for Production Guard and destructive commands.
4. **Typography**:
   - Interface text: `Inter` or `Geist Sans` with tight tracking (`tracking-tight`) and crisp rendering (`antialiased`).
   - Code and BSON identifiers: `JetBrains Mono` or `Geist Mono`.
5. **Component Ergonomics**:
   - Compact row heights (32px to 36px) in Table View.
   - Collapsible left sidebar supporting an icon-only collapsed rail mode.
   - Pill and rounded-md status chips with subtle tinted backgrounds and 1px borders.
   - Command-first navigation via global Command Palette (`Ctrl + K`).

## Alternatives Considered

- **Material Design / Mantine**:
  - *Strengths*: Highly comprehensive component libraries with wide community adoption.
  - *Trade-offs*: Large padding and touch-first spacing defaults require significant override effort to achieve developer-tool information density.

- **Classic Desktop GUI (Native Windows / macOS System Controls)**:
  - *Strengths*: Matches operating system standard widgets.
  - *Trade-offs*: Visual inconsistency across Windows, macOS, and Linux; limited support for custom dark-tech theme aesthetics.

## Consequences

### Positive
- Delivers a visually refined, high-performance experience familiar to modern software engineers.
- Maximizes screen real estate for collection inspection through compact spacing and collapsible panels.
- Provides consistent design tokens easily implemented using Tailwind CSS utilities.

### Negative / Trade-offs
- Requires disciplined curation of custom Tailwind components to maintain visual consistency.
- High-contrast dark themes require rigorous verification of text readability across various monitor panels.

## Related Documents
- [System Architecture Overview](../system-overview.md)
- [Engineering Guidelines](../../engineering/guidelines.md)
- [Document Explorer Specification](../../specifications/features/document-explorer/spec.md)
