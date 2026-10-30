# Domain Glossary

This document defines standard terminology, abbreviations, and concepts used throughout the Mongox product and technical documentation.

## 1. MongoDB Domain Terms

| Term | Definition |
|---|---|
| **BSON** | Binary JSON. The binary-encoded serialization format used by MongoDB to store documents and perform remote procedure calls. Supports rich data types such as `ObjectId`, `Date`, `Decimal128`, `Binary`, and `Regex`. |
| **ObjectId** | A 12-byte unique identifier typically used as the primary key (`_id`) in MongoDB documents, containing a 4-byte timestamp, 5-byte random value, and 3-byte incrementing counter. |
| **Replica Set** | A group of mongod instances that maintain the same data set, providing redundancy and high availability. |
| **Sharded Cluster** | A MongoDB architecture that distributes data across multiple machines to support deployments with large data sets and high throughput operations. |
| **Atlas (SRV)** | MongoDB Cloud hosted service utilizing DNS SRV records (`mongodb+srv://`) to discover connection endpoints dynamically. |
| **mongosh** | The modern official MongoDB Shell command-line utility used for interacting with MongoDB deployments via JavaScript. |
| **mongodb-database-tools** | The official suite of command-line utilities for working with MongoDB data, including `mongodump`, `mongorestore`, `mongoexport`, `mongoimport`, `bsondump`, and `mongostat`. |
| **Aggregation Pipeline** | A framework for data processing modeled on the concept of data processing pipelines, where documents enter a multi-stage pipeline that transforms them into aggregated results. |
| **COLLSCAN** | Collection Scan. An execution plan state indicating that MongoDB scanned every document in a collection because no suitable index was available. |
| **IXSCAN** | Index Scan. An execution plan state indicating that MongoDB used an index to satisfy query constraints. |
| **TTL Index** | Time To Live index. A single-field index that MongoDB uses to automatically remove documents after a specified number of seconds or at a specific clock time. |

## 2. Mongox Specific Terms

| Term | Definition |
|---|---|
| **Zero-Setup Provisioning** | The capability of Mongox to detect, download, verify, and initialize the official `mongosh` and database tools binaries without user intervention. |
| **Production Guard** | A protective mechanism in Mongox that enforces explicit multi-step verification before executing destructive operations on environments designated as Production. |
| **Smart Data Masking** | Rule-based transformation engine that replaces sensitive fields (such as email, national ID, phone number) with obfuscated values during export or testing workflows. |
| **Command Palette** | A keyboard-driven global action menu (`Ctrl + K` or `Cmd + K`) for switching connections, jumping to collections, and executing common actions. |
| **IPC Bridge** | The inter-process communication bridge between the Tauri Rust backend and the React web application runtime. |

## 3. Related Documents

- [Product Overview](./overview.md)
- [System-Wide Requirements](./requirements.md)
