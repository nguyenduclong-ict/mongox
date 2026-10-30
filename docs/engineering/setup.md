# Development Setup and Environment Guide

This document provides instructions for configuring a local workstation to develop, test, and build Mongox.

## 1. Prerequisites

Ensure the following tools are installed on your operating system:

### 1.1. Node.js & Package Manager
- **Node.js**: Version 20 LTS or higher.
- **Package Manager**: `npm` (bundled with Node) or `pnpm` (recommended, version 9+).

### 1.2. Rust Toolchain
- **Rust**: Latest stable compiler (1.80 or higher) installed via `rustup`.
- Verify installation:
  ```bash
  rustc --version
  cargo --version
  ```

### 1.3. Platform Build Tools
- **Windows**:
  - Microsoft Visual Studio C++ Build Tools (with "Desktop development with C++" workload).
  - Microsoft Edge WebView2 runtime (pre-installed on Windows 10/11).
- **macOS**:
  - Xcode Command Line Tools: `xcode-select --install`.
- **Linux (Ubuntu/Debian)**:
  - System development libraries:
    ```bash
    sudo apt-get update && sudo apt-get install -y \
      libwebkit2gtk-4.1-dev \
      build-essential \
      curl \
      wget \
      file \
      libxdo-dev \
      libssl-dev \
      libayatana-appindicator3-dev \
      librsvg2-dev
    ```

## 2. Repository Initialization

Clone the repository and install frontend dependencies:

```bash
# Install frontend packages
npm install
```

## 3. Running Development Mode

Start the Tauri v2 live-reload development server:

```bash
# Starts the Vite frontend server and compiles the Rust backend
npm run tauri dev
```

During development:
- Frontend changes trigger Vite Hot Module Replacement (HMR).
- Rust changes trigger incremental Cargo compilation and window reloads.

## 4. Production Compilation

To generate production-ready desktop installer packages:

```bash
npm run tauri build
```

Generated packages will be located in:
- **Windows**: `src-tauri/target/release/bundle/msi/` or `nsis/`
- **macOS**: `src-tauri/target/release/bundle/dmg/` or `macos/`
- **Linux**: `src-tauri/target/release/bundle/appimage/` or `deb/`

## 5. Local MongoDB Testing Instance

For integration testing, run a local MongoDB instance using Docker:

```bash
docker run -d \
  --name mongox-test-db \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=mongox \
  -e MONGO_INITDB_ROOT_PASSWORD=secret \
  mongo:7.0
```

Connect via Mongox using the connection string:
`mongodb://mongox:secret@localhost:27017/?authSource=admin`

## 6. Related Documents

- [System Architecture Overview](../architecture/system-overview.md)
- [Engineering Guidelines](./guidelines.md)
- [Security Guidelines](./security.md)
