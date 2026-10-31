# Feature: MongoDB User & Role Management

## 1. Overview

### Purpose
Enable database administrators and developers to inspect, create, update roles for, change passwords of, and remove MongoDB database users directly through a dedicated interface.

### Background
Database user administration in MongoDB is typically managed through administrative shell commands (`db.createUser()`, `db.updateUser()`, `db.dropUser()`). Providing an interactive, visual user management interface allows teams to configure database access control without writing manual administrative scripts.

### Status
Implemented

## 2. Scope

### In Scope
- Listing database users for any selected database (`db.getUsers()` or `admin.command({ usersInfo: 1 })`).
- Creating a new database user with custom username, password, authentication database, and roles.
- Role management supporting standard built-in roles (`read`, `readWrite`, `dbAdmin`, `userAdmin`, `clusterAdmin`, etc.).
- Changing user passwords securely.
- Removing database users (`db.dropUser()`) with safety confirmation.
- Integration with Object Explorer database context menu ("Manage Users").
- Support across both Tauri desktop IPC and Vite dev/preview server bridge.

### Out of Scope
- LDAP and Kerberos directory server user synchronization (planned for enterprise iterations).

## 3. Actors and Permissions
- **Actor:** Database Administrator / Developer with `userAdmin` or `userAdminAnyDatabase` privilege.
- **Permissions:** Full access to manage users on databases where privileges apply.
- **Restrictions:** Dropping users requires explicit confirmation dialog.

## 4. Functional Requirements

### FR-USR-001: List Database Users
- **Description:** Retrieves and displays existing MongoDB users for the target database.
- **Preconditions:** Connected to a MongoDB cluster; user has permission to inspect users.
- **Expected Behavior:** Queries the database's user directory and returns a structured list containing username, roles, and authentication database.
- **Acceptance Criteria:**
  - AC-USR-01: Displays all users defined in the current database.
  - AC-USR-02: Lists each user's assigned roles with database scope.

### FR-USR-002: Create Database User
- **Description:** Adds a new user account with credentials and assigned roles to the database.
- **Preconditions:** User management dialog open.
- **Expected Behavior:** Validates non-empty username, secure password, and at least one assigned role. Executes `db.createUser()` and refreshes user directory.
- **Acceptance Criteria:**
  - AC-USR-03: Successfully creates user and adds to user list.
  - AC-USR-04: Displays error notification if username already exists.

### FR-USR-003: Update User Roles and Password
- **Description:** Modifies assigned roles or updates password for an existing user.
- **Preconditions:** Existing user selected.
- **Expected Behavior:** Updates user definition using `db.updateUser()`.
- **Acceptance Criteria:**
  - AC-USR-05: Modifies roles without dropping user.
  - AC-USR-06: Updates password securely.

### FR-USR-004: Drop Database User
- **Description:** Removes a user account from the database.
- **Preconditions:** User selected for deletion.
- **Expected Behavior:** Prompts confirmation dialog and executes `db.dropUser()`.
- **Acceptance Criteria:**
  - AC-USR-07: Removes user and refreshes user list upon confirmation.

## 5. Security & Privacy
- User passwords are transmitted securely to backend commands and are never logged in plaintext.

## 6. API & Integration
- **Tauri Commands:**
  - `list_database_users(connection_id: String, database: String) -> Result<Vec<MongoUser>, String>`
  - `create_database_user(connection_id: String, database: String, user: CreateUserRequest) -> Result<(), String>`
  - `update_database_user(connection_id: String, database: String, username: String, update: UpdateUserRequest) -> Result<(), String>`
  - `drop_database_user(connection_id: String, database: String, username: String) -> Result<(), String>`
- **Bridge Endpoints:**
  - `GET /api/mongo/users?connection_id=...&database=...`
  - `POST /api/mongo/users/create`
  - `POST /api/mongo/users/update`
  - `POST /api/mongo/users/delete`
