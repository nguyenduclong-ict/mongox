# ADR-0001: Selection of Tauri v2 with Rust Runtime

## Status
Accepted

## Context
Mongox is designed to provide a fast, responsive, and lightweight desktop administration client for MongoDB. Existing solutions frequently suffer from high idle memory consumption (often exceeding 500MB to 1GB RAM) and sluggish startup times due to bundling full Chromium and Node.js runtimes. 

The application requires:
1. Fast cold-start execution under 1.5 seconds.
2. Low baseline idle memory footprint (under 150MB RSS).
3. Robust child process management and OS-level security APIs for managing background tools (`mongosh`, `mongodump`).
4. Modern, responsive user interface supporting dark-mode UI systems and rich interactive tables.

## Decision
We select **Tauri v2** with a **Rust** backend and a **React 19** / **TypeScript** / **Tailwind CSS** frontend.

Tauri utilizes the host platform's native webview (Microsoft Edge WebView2 on Windows, WebKit on macOS, WebKitGTK on Linux), which eliminates the need to bundle a full Chromium engine. The Rust runtime provides strong memory safety, native concurrency via Tokio, and fine-grained control over external process streams and operating system credential stores.

## Alternatives Considered

- **Electron**:
  - *Strengths*: Highly mature ecosystem, extensive documentation, uniform Chromium runtime across platforms.
  - *Trade-offs*: Large bundle sizes (over 120MB installer), high baseline memory consumption (400MB+ on launch), longer startup latency.

- **Native Desktop (C++ / Qt or C# / WPF)**:
  - *Strengths*: Maximum native execution speed, minimal runtime overhead.
  - *Trade-offs*: Higher development complexity, cross-platform UI divergence, slower frontend iteration compared to modern React and CSS component libraries.

- **Go + Wails**:
  - *Strengths*: Lightweight runtime, native webview integration, fast compilation.
  - *Trade-offs*: Less mature ecosystem for desktop background process lifecycle hooks compared to Tauri v2; Tauri v2 provides deeper multi-window and mobile/desktop cross-compilation support.

## Consequences

### Positive
- Significant reduction in application installer size and runtime memory consumption.
- Memory-safe child process orchestration in Rust prevents memory leaks during heavy backup and stream processing operations.
- Rapid UI development using React 19, TypeScript, and modern component ecosystems.

### Negative / Trade-offs
- Webview rendering engine differences across operating systems require automated cross-platform UI validation.
- Compiling Rust code requires a complete native Rust toolchain and platform C++ build tools.

## Related Documents
- [System Architecture Overview](../system-overview.md)
- [ADR-0002: Zero-Setup Auto-Provisioning Engine](./0002-zero-setup-auto-provisioning.md)
- [Development Setup](../../engineering/setup.md)
