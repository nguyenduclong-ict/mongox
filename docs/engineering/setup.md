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

## 5. Local MongoDB Testing Instance with Docker Compose

Mongox provides a pre-configured `docker-compose.yml` file with automated database seeding:

```bash
# Start containerized MongoDB 7.0 on port 27017
docker compose up -d
```

The container automatically mounts `docker/init-mongo.js` and seeds `test_db` with:
- `customers` (100 documents with unique emails)
- `orders` (500 documents with foreign customer references)
- `products` (50 catalog products)
- `large_dataset` (5,000 documents with compound indexes for virtualization benchmarks)

Connect using credentials:
- **Connection URI**: `mongodb://mongox:mongoxpass@localhost:27017/test_db?authSource=admin`

To shut down the container:
```bash
docker compose down
```

## 6. End-to-End Testing with Playwright

Run the automated Playwright E2E scenario suite:

```bash
# Execute headless E2E tests
npm run test:e2e

# Open interactive Playwright Test UI
npx playwright test --ui
```

## 7. Related Documents

- [Playwright Test Plan](./playwright-test-plan.md)
- [Testing Guidelines](./testing.md)
- [System Architecture Overview](../architecture/system-overview.md)
- [Engineering Guidelines](./guidelines.md)
- [Security Guidelines](./security.md)
