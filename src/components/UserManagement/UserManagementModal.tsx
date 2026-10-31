import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  X,
  Plus,
  Trash2,
  KeyRound,
  Shield,
  RefreshCw,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { MongoUser, MongoUserRole } from "../../types";
import {
  listDatabaseUsers,
  createDatabaseUser,
  updateDatabaseUser,
  dropDatabaseUser,
} from "../../services/tauri";
import { Checkbox } from "../ui/Checkbox";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  availableDatabases?: string[];
  isProduction?: boolean;
}

const COMMON_ROLES = ["read", "readWrite", "dbAdmin", "userAdmin", "dbOwner"];
const ADMIN_ROLES = ["root", "clusterAdmin", "userAdminAnyDatabase", "readWriteAnyDatabase"];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  connectionId,
  database,
  availableDatabases = [],
  isProduction: _isProduction = false,
}) => {
  const [currentDb, setCurrentDb] = useState<string>(database || "admin");
  const [users, setUsers] = useState<MongoUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add User Form State
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["readWrite"]);

  // Edit / Password Dialog State
  const [editingUser, setEditingUser] = useState<MongoUser | null>(null);
  const [changePwdUser, setChangePwdUser] = useState<string | null>(null);
  const [newPwdVal, setNewPwdVal] = useState<string>("");
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const availableRoles = currentDb === "admin" ? [...COMMON_ROLES, ...ADMIN_ROLES] : COMMON_ROLES;

  const allDbs = Array.from(new Set(["admin", database, ...availableDatabases].filter(Boolean)));

  const loadUsers = useCallback(async (targetDb?: string) => {
    const dbToQuery = targetDb || currentDb;
    if (!connectionId || !dbToQuery) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listDatabaseUsers(connectionId, dbToQuery);
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load database users");
    } finally {
      setLoading(false);
    }
  }, [connectionId, currentDb]);

  useEffect(() => {
    if (isOpen) {
      setCurrentDb(database || "admin");
      loadUsers(database || "admin");
      setIsAddingUser(false);
      setEditingUser(null);
      setChangePwdUser(null);
      setUserToDelete(null);
      setSuccessMsg(null);
    }
  }, [isOpen, database, loadUsers]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;

    setError(null);
    try {
      const roles: MongoUserRole[] = selectedRoles.map((r) => ({
        role: r,
        db: currentDb,
      }));

      await createDatabaseUser({
        connection_id: connectionId,
        database: currentDb,
        username: newUsername.trim(),
        password: newPassword,
        roles,
      });

      showSuccess(`User '${newUsername.trim()}' created successfully.`);
      setNewUsername("");
      setNewPassword("");
      setSelectedRoles(["readWrite"]);
      setIsAddingUser(false);
      await loadUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to create user");
    }
  };

  const handleUpdateRoles = async (user: MongoUser, newRoles: string[]) => {
    setError(null);
    try {
      const roles: MongoUserRole[] = newRoles.map((r) => ({
        role: r,
        db: currentDb,
      }));

      await updateDatabaseUser({
        connection_id: connectionId,
        database: currentDb,
        username: user.user,
        roles,
      });

      showSuccess(`Roles updated for '${user.user}'.`);
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to update user roles");
    }
  };

  const handleChangePassword = async (username: string) => {
    if (!newPwdVal) return;
    setError(null);
    try {
      await updateDatabaseUser({
        connection_id: connectionId,
        database: currentDb,
        username,
        password: newPwdVal,
      });

      showSuccess(`Password updated for '${username}'.`);
      setChangePwdUser(null);
      setNewPwdVal("");
    } catch (err: any) {
      setError(err?.message || "Failed to change password");
    }
  };

  const handleDropUser = async (username: string) => {
    setError(null);
    try {
      await dropDatabaseUser(connectionId, currentDb, username);
      showSuccess(`User '${username}' removed.`);
      setUserToDelete(null);
      await loadUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to remove user");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-modal border border-white/10 rounded-xl shadow-modal text-gray-200 overflow-hidden flex flex-col max-h-[85vh] font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between shrink-0 bg-modal">
          <div className="flex items-center gap-3 min-w-0">
            <Users className="w-4 h-4 text-mongo shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white tracking-tight truncate">
                Database Users: <span className="font-mono text-mongo">{database}</span>
              </h2>
              <p className="text-[12px] text-gray-400 font-normal mt-0.5">
                Manage credentials, privileges, and role assignments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => loadUsers()}
              disabled={loading}
              aria-label="Refresh Users"
              className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
              title="Refresh Users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-mongo" : ""}`} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Banners */}
        {error && (
          <div className="bg-guard/10 border-b border-guard/30 px-6 py-2 text-xs text-red-300 flex items-center gap-2 select-text cursor-text">
            <AlertTriangle className="w-3.5 h-3.5 text-guard shrink-0" />
            <span className="break-all">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-mongo/10 border-b border-mongo/30 px-6 py-2 text-xs text-emerald-300 flex items-center gap-2 select-text cursor-text">
            <Check className="w-3.5 h-3.5 text-mongo shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Action Bar & Database Switcher */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-mono text-xs">Target Database:</span>
              <select
                value={currentDb}
                onChange={(e) => {
                  const newDb = e.target.value;
                  setCurrentDb(newDb);
                  loadUsers(newDb);
                }}
                className="px-2.5 py-1.5 rounded-md bg-surface border border-hairline font-mono text-xs text-mongo focus:outline-none focus:border-mongo cursor-pointer"
              >
                {allDbs.map((d) => (
                  <option key={d} value={d} className="bg-modal text-white">
                    {d}
                  </option>
                ))}
              </select>
              <span className="text-gray-400 font-mono text-[11px] ml-1">
                ({users.length} accounts)
              </span>
            </div>

            <button
              onClick={() => setIsAddingUser(!isAddingUser)}
              className="px-3 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-gray-950 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingUser ? "Cancel" : "Add User"}</span>
            </button>
          </div>

          {/* Add User Form Drawer */}
          {isAddingUser && (
            <form onSubmit={handleCreateUser} className="p-4 rounded-lg bg-surface/60 border border-hairline space-y-3">
              <h3 className="text-xs font-semibold text-white">Create New Database User</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. app_service"
                    required
                    className="w-full px-2.5 py-1.5 bg-surface border border-hairline rounded font-mono text-xs text-white focus:outline-none focus:border-mongo"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pr-8 px-2.5 py-1.5 bg-surface border border-hairline rounded font-mono text-xs text-white focus:outline-none focus:border-mongo"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1.5">
                  Assigned Roles ({selectedRoles.length})
                </label>
                <div className="grid grid-cols-2 gap-2 p-2 bg-surface/80 border border-hairline rounded max-h-36 overflow-y-auto">
                  {availableRoles.map((role) => {
                    const isChecked = selectedRoles.includes(role);
                    return (
                      <div key={role} className="flex items-center">
                        <Checkbox
                          checked={isChecked}
                          onChange={(checked) => {
                            setSelectedRoles((prev) =>
                              checked ? [...prev, role] : prev.filter((r) => r !== role)
                            );
                          }}
                          label={<span className="font-mono text-xs text-gray-200">{role}</span>}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline/60">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="px-3 py-1.5 rounded-md hover:bg-surface text-gray-400 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-mongo hover:bg-emerald-600 text-gray-950 font-semibold text-xs transition-colors"
                >
                  Save User
                </button>
              </div>
            </form>
          )}

          {/* User List */}
          {users.length === 0 && !loading ? (
            <div className="p-8 text-center text-gray-500 italic font-mono text-xs bg-surface/30 rounded-lg border border-hairline">
              No users explicitly configured for database '{database}'.
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const isEditing = editingUser?.user === u.user;
                const isChangingPwd = changePwdUser === u.user;

                return (
                  <div
                    key={u.user}
                    className="p-3 rounded-lg bg-surface/50 border border-hairline space-y-2 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white font-mono">{u.user}</span>
                        <span className="text-[10px] text-gray-400 font-mono">@{u.db}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setChangePwdUser(isChangingPwd ? null : u.user);
                            setNewPwdVal("");
                          }}
                          className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
                          title="Change Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingUser(isEditing ? null : u)}
                          className="p-1 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
                          title="Edit Roles"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setUserToDelete(u.user)}
                          className="p-1 rounded hover:bg-surface text-gray-400 hover:text-guard transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Roles Tags */}
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded bg-surface border border-hairline text-gray-300 font-mono text-[10px]"
                        >
                          {r.role}
                          {r.db !== database && <span className="text-gray-400"> ({r.db})</span>}
                        </span>
                      ))}
                    </div>

                    {/* Inline Change Password Box */}
                    {isChangingPwd && (
                      <div className="pt-2 border-t border-hairline flex items-center gap-2">
                        <input
                          type="password"
                          value={newPwdVal}
                          onChange={(e) => setNewPwdVal(e.target.value)}
                          placeholder="New password"
                          className="flex-1 px-2.5 py-1 bg-surface border border-hairline rounded font-mono text-xs text-white focus:outline-none focus:border-mongo"
                        />
                        <button
                          onClick={() => handleChangePassword(u.user)}
                          disabled={!newPwdVal}
                          className="px-3 py-1 rounded bg-mongo text-gray-950 font-semibold text-xs disabled:opacity-50"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => setChangePwdUser(null)}
                          className="px-2.5 py-1 rounded hover:bg-surface text-gray-400 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Inline Edit Roles Box */}
                    {isEditing && (
                      <div className="pt-2 border-t border-hairline space-y-2">
                        <span className="text-[11px] text-gray-400">Toggle Roles:</span>
                        <div className="flex flex-wrap gap-1">
                          {availableRoles.map((role) => {
                            const hasRole = u.roles.some((r) => r.role === role);
                            return (
                              <button
                                key={role}
                                onClick={() => {
                                  const updated = hasRole
                                    ? u.roles.map((r) => r.role).filter((r) => r !== role)
                                    : [...u.roles.map((r) => r.role), role];
                                  handleUpdateRoles(u, updated);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                  hasRole
                                    ? "bg-mongo/20 border-mongo text-emerald-300 font-semibold"
                                    : "bg-surface border-hairline text-gray-400 hover:text-gray-200"
                                }`}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Delete Confirmation Dialog */}
        {userToDelete && (
          <div className="px-6 py-3.5 bg-surface/80 border-t border-guard/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-red-200">
              <AlertTriangle className="w-4 h-4 text-guard shrink-0" />
              <span>
                Permanently drop user <strong className="text-white font-mono">{userToDelete}</strong>?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 rounded-md hover:bg-surface text-gray-300 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDropUser(userToDelete)}
                className="px-3.5 py-1.5 rounded-md bg-guard hover:bg-red-600 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                Drop User
              </button>
            </div>
          </div>
        )}
        {/* Footer */}
        <div className="px-6 py-4 border-t border-hairline bg-panel flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-surface hover:bg-white/[0.08] text-xs font-medium text-gray-200 border border-hairline transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
